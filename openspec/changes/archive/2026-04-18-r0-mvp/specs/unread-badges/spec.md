## ADDED Requirements

### Requirement: Per-user last-read pointer

The system SHALL track, per `(conversationId, userId)`, a `lastReadMessageId` that identifies the newest message the user has seen, used to derive unread counts.

#### Scenario: Data model exists

- **WHEN** the Prisma schema is inspected
- **THEN** a `MessageRead` model exists with fields `conversationId`, `userId`, `lastReadMessageId`, `updatedAt`
- **AND** a compound primary key (or unique constraint) enforces one row per `(conversationId, userId)`

### Requirement: Mark conversation read

The system SHALL provide an endpoint that upserts `MessageRead.lastReadMessageId` to the newest message id known to the caller, and SHALL publish an `unread.changed` event with `unread=0` to the caller's own `user:{id}` channel so other tabs clear the badge.

#### Scenario: Opening a conversation marks it read

- **WHEN** an authenticated member calls `POST /api/conversations/:id/read` with `{ "lastReadMessageId": "<ulid>" }`
- **THEN** the server upserts `MessageRead (conversationId, userId=caller, lastReadMessageId)` in Postgres
- **AND** publishes `unread.changed` on the caller's `user:{id}` channel with payload `{ conversationId, unread: 0 }`
- **AND** responds with `204 No Content`

#### Scenario: Read pointer never moves backward

- **WHEN** `POST /api/conversations/:id/read` is called with a `lastReadMessageId` that is lexically lower than the currently stored value
- **THEN** the server keeps the higher (more recent) value and still responds with `204 No Content`

#### Scenario: Non-member cannot mark read

- **WHEN** a non-member of the conversation calls `POST /api/conversations/:id/read`
- **THEN** the server responds with `403 Forbidden`

### Requirement: Initial unread snapshot

The system SHALL expose an endpoint that returns the unread count for every conversation the current user belongs to, used to seed the sidebar badge state on app load.

#### Scenario: Snapshot returns per-conversation unread counts

- **WHEN** an authenticated user calls `GET /api/me/unread`
- **THEN** the server responds with `200 OK` and a JSON array `[{ conversationId, unread }]`
- **AND** `unread` for each conversation equals the number of `Message` rows in that conversation with `id > COALESCE(MessageRead.lastReadMessageId, '')`

### Requirement: Live unread updates on message create

The system SHALL publish an `unread.changed` event on every recipient's `user:{id}` channel whenever a message is created in a conversation they belong to, excluding the author, with a delta payload the client can merge without recomputing.

#### Scenario: Recipients receive unread delta

- **WHEN** user A sends a message to conversation C that includes user B (and possibly others)
- **THEN** the server, after DB commit, publishes `unread.changed` with `{ conversationId: C, unreadDelta: 1 }` to `user:{B}` (and each other non-author recipient)
- **AND** does NOT publish `unread.changed` to `user:{A}` for this message

#### Scenario: Client merges delta into badge state

- **WHEN** the client receives `unread.changed` with `{ conversationId, unreadDelta }`
- **THEN** it increments its local unread count for `conversationId` by `unreadDelta` unless the conversation is currently active in this tab
- **AND** the sidebar badge for that conversation updates within the 3-second delivery budget
