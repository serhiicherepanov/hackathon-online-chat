# unread-badges Specification

## Purpose

Defines R0 unread tracking: a per-user `MessageRead.lastReadMessageId` pointer per conversation, a mark-read endpoint that upserts the pointer monotonically and fans out `unread.changed` to other tabs of the same user, an initial snapshot endpoint (`GET /api/me/unread`) that seeds sidebar badges on load, and live `unread.changed` deltas published to every non-author recipient when a message is created so the sidebar badge updates within the 3-second delivery budget.

## Requirements

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

### Requirement: Sidebar unread badges preserve row layout

The sidebar SHALL present unread badges in a way that does not change conversation row height or cause visible layout shift as unread counts appear, grow, shrink, or clear. Unread badges with a non-zero count SHALL use an accent treatment that is visually stronger than the muted/default chip styling.

#### Scenario: Count changes do not shift the row layout

- **WHEN** a sidebar conversation row transitions between no unread badge, a one-digit unread count, and a multi-digit unread count
- **THEN** the overall row height remains unchanged
- **AND** adjacent rows do not visibly jump up or down as the count changes

#### Scenario: Unread badge uses an accented visual state

- **WHEN** a conversation has `unread > 0`
- **THEN** its sidebar badge renders with a colored unread treatment instead of a neutral gray chip
- **AND** the badge remains readable against the surrounding sidebar surface
