## MODIFIED Requirements

### Requirement: Send a text message to a conversation

The system SHALL accept messages from an authenticated member of a conversation, persist them in PostgreSQL before acknowledging the client, and then fan them out via Centrifugo. A message body MAY be empty when the message carries at least one attachment, and MAY include a `replyToId` referencing a non-deleted message in the same conversation.

#### Scenario: Member sends a valid text message

- **WHEN** an authenticated user who is a member of conversation C calls `POST /api/conversations/:id/messages` with `{ "body": "<text up to 3 KB>" }`
- **THEN** the server generates a ULID `id` for the message
- **AND** inserts a `Message` row `(id, conversationId=C, authorId=caller, body, replyToId=NULL, editedAt=NULL, deletedAt=NULL, createdAt=now)` inside a transaction
- **AND** after commit, publishes `message.created` on the appropriate channel (`room:{convId}` for rooms, `dm:{convId}` for DMs) with the full message payload (including resolved `attachments` and `replyTo` preview)
- **AND** publishes `unread.changed` with `unreadDelta=1` to every recipient's `user:{id}` channel (excluding the author)
- **AND** responds with `201 Created` and the persisted message object

#### Scenario: Member sends a message with attachments

- **WHEN** the caller sends `{ body, attachmentIds: [a, b] }` and every listed attachment belongs to the caller and is unassociated
- **THEN** the server inserts the `Message` row and, within the same transaction, sets `Attachment.messageId` to the new message id for every listed `attachmentId`
- **AND** publishes `message.created` with the attachment metadata embedded in the payload

#### Scenario: Member sends a reply

- **WHEN** the caller sends `{ body, replyToId: R }` where R is the id of a non-deleted message in the same conversation
- **THEN** the server inserts the `Message` row with `replyToId = R`
- **AND** the published `message.created` payload includes `replyTo: { id, authorId, bodyPreview, deletedAt }` where `bodyPreview` is the first 140 characters of R's body

#### Scenario: Reply target in another conversation is rejected

- **WHEN** the caller sends `replyToId = R` but R's `conversationId` differs from the target conversation
- **THEN** the server responds `400 Bad Request`
- **AND** no message row is created

#### Scenario: Reply target that is deleted is rejected

- **WHEN** the caller sends `replyToId = R` but R has `deletedAt IS NOT NULL`
- **THEN** the server responds `400 Bad Request`
- **AND** no message row is created

#### Scenario: Empty body without attachments is rejected

- **WHEN** `POST /api/conversations/:id/messages` is called with a body that is missing, empty after trim, or consists only of whitespace, AND `attachmentIds` is empty or absent
- **THEN** the server responds with `400 Bad Request`
- **AND** no `Message` row is created

#### Scenario: Empty body with attachments is accepted

- **WHEN** the caller sends `{ body: "", attachmentIds: [a] }` and attachment `a` belongs to the caller
- **THEN** the server creates the message with `body = ""` and associates the attachment
- **AND** responds `201 Created`

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

## ADDED Requirements

### Requirement: Author can edit own message

The system SHALL allow the author of a message to edit its body at `PATCH /api/messages/:id` until R3 extends this to admins. Edits SHALL set `editedAt = now`, leave `createdAt` unchanged, and publish `message.updated` so every subscriber sees the new body live.

#### Scenario: Author edits own message

- **WHEN** the author calls `PATCH /api/messages/:id` with `{ body: "<new text ≤ 3 KB>" }`
- **THEN** the server updates `body` and sets `editedAt = now`
- **AND** after commit, publishes `message.updated` on the message's conversation channel with the full updated message payload
- **AND** responds `200 OK` with the updated message

#### Scenario: Non-author cannot edit

- **WHEN** a user who is not the author calls `PATCH /api/messages/:id`
- **THEN** the server responds `403 Forbidden`
- **AND** no changes are persisted
- **AND** no event is published

#### Scenario: Editing a deleted message is rejected

- **WHEN** the author calls `PATCH /api/messages/:id` on a message with `deletedAt IS NOT NULL`
- **THEN** the server responds `410 Gone`
- **AND** no changes are persisted

#### Scenario: Empty new body without attachments is rejected

- **WHEN** the author calls `PATCH /api/messages/:id` with an empty/whitespace body and the message has no attachments
- **THEN** the server responds `400 Bad Request`

#### Scenario: No-op edit is rejected

- **WHEN** the author calls `PATCH /api/messages/:id` with a body whose trimmed value equals the current `body`
- **THEN** the server responds `400 Bad Request`
- **AND** `editedAt` is unchanged
- **AND** no event is published

#### Scenario: Oversized new body is rejected

- **WHEN** the edit body exceeds 3072 bytes of UTF-8
- **THEN** the server responds `413 Payload Too Large`

### Requirement: Author can soft-delete own message

The system SHALL allow the author of a message to delete it at `DELETE /api/messages/:id`. Deletion SHALL be a soft delete (`deletedAt = now`); the row is retained so replies targeting it still render a "[deleted message]" placeholder. The server SHALL publish `message.deleted` so recipients remove the message live.

#### Scenario: Author deletes own message

- **WHEN** the author calls `DELETE /api/messages/:id` on a non-deleted message
- **THEN** the server sets `deletedAt = now`
- **AND** after commit, publishes `message.deleted` with `{ id, conversationId, deletedAt }`
- **AND** responds `204 No Content`

#### Scenario: Deleted payload hides body and attachments

- **WHEN** any history or event serializer emits a message with `deletedAt IS NOT NULL`
- **THEN** the payload omits `body`, `attachments`, and `replyTo` preview text
- **AND** sets `deleted: true` on the payload

#### Scenario: Non-author cannot delete

- **WHEN** a user who is not the author calls `DELETE /api/messages/:id`
- **THEN** the server responds `403 Forbidden`
- **AND** no changes are persisted
- **AND** no event is published

#### Scenario: Deleting an already-deleted message is idempotent

- **WHEN** the author calls `DELETE /api/messages/:id` on a message with `deletedAt IS NOT NULL`
- **THEN** the server responds `204 No Content`
- **AND** no new event is published

### Requirement: Reply metadata in payloads

The system SHALL include a compact `replyTo` object on every message payload (history pages and realtime events) whose `replyToId` is not null.

#### Scenario: Payload shape for a reply

- **WHEN** a message with `replyToId = R` is serialized
- **THEN** the payload includes `replyTo: { id: R, authorId, authorUsername, bodyPreview, deleted }`
- **AND** `bodyPreview` is the first 140 characters of R's body when R is not deleted, otherwise `null`
- **AND** `deleted` is `true` when R has `deletedAt IS NOT NULL`, otherwise `false`

#### Scenario: Reply target that no longer exists

- **WHEN** a message's `replyToId` points to a row that no longer exists (e.g. hard delete in R3)
- **THEN** the payload includes `replyTo: { id: R, deleted: true }` with no author or preview

### Requirement: Attachments are returned on message payloads

The system SHALL include an `attachments` array on every message payload, in stable order by `Attachment.createdAt ASC, id ASC`.

#### Scenario: Message payload includes attachments

- **WHEN** a message with N ≥ 1 attached `Attachment` rows is serialized for history or realtime
- **THEN** the payload includes `attachments: [{ id, kind, originalName, mime, size, comment }]`
- **AND** the array is ordered by `(createdAt ASC, id ASC)`
