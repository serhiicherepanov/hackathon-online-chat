## ADDED Requirements

### Requirement: Send a text message to a conversation

The system SHALL accept plain-text messages from an authenticated member of a conversation, persist them in PostgreSQL before acknowledging the client, and then fan them out via Centrifugo.

#### Scenario: Member sends a valid message

- **WHEN** an authenticated user who is a member of conversation C calls `POST /api/conversations/:id/messages` with `{ "body": "<text up to 3 KB>" }`
- **THEN** the server generates a ULID `id` for the message
- **AND** inserts a `Message` row `(id, conversationId=C, authorId=caller, body, createdAt=now)` inside a transaction
- **AND** after commit, publishes `message.created` on the appropriate channel (`room:{convId}` for rooms, `dm:{convId}` for DMs) with the full message payload
- **AND** publishes `unread.changed` with `unreadDelta=1` to every recipient's `user:{id}` channel (excluding the author)
- **AND** responds with `201 Created` and the persisted message object

#### Scenario: Empty body is rejected

- **WHEN** `POST /api/conversations/:id/messages` is called with a body that is missing, empty after trim, or consists only of whitespace
- **THEN** the server responds with `400 Bad Request`
- **AND** no `Message` row is created

#### Scenario: Oversized body is rejected

- **WHEN** `POST /api/conversations/:id/messages` is called with a body whose UTF-8 byte length exceeds 3072 (3 KB)
- **THEN** the server responds with `413 Payload Too Large`
- **AND** no `Message` row is created

#### Scenario: Non-member is forbidden

- **WHEN** a user who is neither a `RoomMember` (for room conversations) nor a `DmParticipant` (for DM conversations) calls `POST /api/conversations/:id/messages`
- **THEN** the server responds with `403 Forbidden`
- **AND** no `Message` row is created
- **AND** no Centrifugo publish occurs

#### Scenario: Unknown conversation returns 404

- **WHEN** `POST /api/conversations/:id/messages` is called with an id that does not exist in `Conversation`
- **THEN** the server responds with `404 Not Found`

### Requirement: Paginated message history (keyset)

The system SHALL expose a keyset-paginated endpoint that returns up to `limit` messages from a conversation in reverse chronological order, optionally anchored before a cursor, suitable for infinite scroll.

#### Scenario: Initial page returns newest messages

- **WHEN** a conversation member calls `GET /api/conversations/:id/messages?limit=50`
- **THEN** the server responds with `200 OK` and a JSON object `{ messages: Message[], nextCursor: string | null }`
- **AND** `messages` contains the 50 newest messages for the conversation, ordered by `(createdAt DESC, id DESC)`
- **AND** `nextCursor` is the id of the oldest message in the page, or `null` if fewer than 50 messages exist

#### Scenario: Older page uses `before` cursor

- **WHEN** a member calls `GET /api/conversations/:id/messages?before=<ulid>&limit=50`
- **THEN** the response contains up to 50 messages strictly older than the cursor message, in the same order

#### Scenario: Limit is clamped

- **WHEN** `limit` is omitted, out of range, or greater than 100
- **THEN** the server uses a default of 50 and caps the effective limit at 100

#### Scenario: Non-member cannot read history

- **WHEN** a non-member calls `GET /api/conversations/:id/messages`
- **THEN** the server responds with `403 Forbidden`

### Requirement: Message ordering invariants

The system SHALL assign `Message.id` as a ULID generated server-side at write time and SHALL order history by `(createdAt DESC, id DESC)` so that clients merging live `message.created` events with paginated history never observe duplicates or out-of-order gaps.

#### Scenario: ULID ordering ties createdAt

- **WHEN** two `Message` rows share the same millisecond `createdAt`
- **THEN** the history query still returns them in a stable order, because `id` (ULID) is the secondary sort key and is monotonically increasing within a millisecond for the same server process

#### Scenario: Composite index supports history queries

- **WHEN** the Prisma schema is inspected
- **THEN** `Message` declares a composite index on `(conversationId, createdAt, id)` (descending use is served by the same index in Postgres)

### Requirement: Offline message delivery on next connect

The system SHALL persist every message regardless of recipient connection state, so a user who is offline when a message is sent SHALL see it when they next open the app.

#### Scenario: Offline recipient sees message on next page load

- **WHEN** user B is offline and user A sends a message to a conversation C that contains B
- **THEN** the `Message` row is persisted
- **AND** when B later opens the app and navigates to C, the initial history page contains the message, served by the standard history endpoint
