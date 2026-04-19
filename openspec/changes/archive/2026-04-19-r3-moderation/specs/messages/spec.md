## MODIFIED Requirements

### Requirement: Author can soft-delete own message

The system SHALL allow the author of a message to delete it at `DELETE /api/messages/:id`. For room conversations only, a room `admin` or `owner` SHALL also be allowed to delete another participant's message. Deletion SHALL be a soft delete (`deletedAt = now`); the row is retained so replies targeting it still render a "[deleted message]" placeholder. The server SHALL publish `message.deleted` so recipients remove the message live.

#### Scenario: Author deletes own message

- **WHEN** the author calls `DELETE /api/messages/:id` on a non-deleted message
- **THEN** the server sets `deletedAt = now`
- **AND** after commit, publishes `message.deleted` with `{ id, conversationId, deletedAt }`
- **AND** responds `204 No Content`

#### Scenario: Room admin deletes another user's message

- **WHEN** a caller whose role is `admin` or `owner` in the room backing the message calls `DELETE /api/messages/:id` on another user's non-deleted room message
- **THEN** the server sets `deletedAt = now`
- **AND** after commit, publishes `message.deleted` with `{ id, conversationId, deletedAt }`
- **AND** responds `204 No Content`

#### Scenario: DM participant cannot moderate another user's message

- **WHEN** a user who is not the author calls `DELETE /api/messages/:id` for a direct-message conversation
- **THEN** the server responds `403 Forbidden`
- **AND** no changes are persisted
- **AND** no event is published

#### Scenario: Deleted payload hides body and attachments

- **WHEN** any history or event serializer emits a message with `deletedAt IS NOT NULL`
- **THEN** the payload omits `body`, `attachments`, and `replyTo` preview text
- **AND** sets `deleted: true` on the payload

#### Scenario: Unauthorized caller cannot delete

- **WHEN** a user who is neither the author nor a room `admin`/`owner` for the room backing the message calls `DELETE /api/messages/:id`
- **THEN** the server responds `403 Forbidden`
- **AND** no changes are persisted
- **AND** no event is published

#### Scenario: Deleting an already-deleted message is idempotent

- **WHEN** an authorized caller calls `DELETE /api/messages/:id` on a message with `deletedAt IS NOT NULL`
- **THEN** the server responds `204 No Content`
- **AND** no new event is published
