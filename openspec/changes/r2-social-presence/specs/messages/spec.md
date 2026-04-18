## MODIFIED Requirements

### Requirement: Send a text message to a conversation
The system SHALL accept messages from an authenticated member of a conversation, persist them in PostgreSQL before acknowledging the client, and then fan them out via Centrifugo. A message body MAY be empty when the message carries at least one attachment, and MAY include a `replyToId` referencing a non-deleted message in the same conversation. For direct-message conversations, the server SHALL reject new sends whenever either participant has an active user block against the other; blocked DMs remain readable but frozen read-only.

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

#### Scenario: Blocked DM is frozen read-only
- **WHEN** a participant in a DM conversation calls `POST /api/conversations/:id/messages` and either participant currently blocks the other
- **THEN** the server responds with `403 Forbidden`
- **AND** no `Message` row is created
- **AND** no Centrifugo publish occurs

#### Scenario: Grandfathered DM still allows sends when unblocked
- **WHEN** a DM conversation was created before R2 between two users who are not currently friends, and neither direction has an active block
- **THEN** either existing participant may still send a message successfully

#### Scenario: Unknown conversation returns 404
- **WHEN** `POST /api/conversations/:id/messages` is called with an id that does not exist in `Conversation`
- **THEN** the server responds with `404 Not Found`
