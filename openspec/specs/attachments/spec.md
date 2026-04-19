# attachments Specification

## Purpose
TBD - created by archiving change r1-rich-messaging. Update Purpose after archive.
## Requirements
### Requirement: Two-phase upload via `POST /api/uploads`

The system SHALL accept multipart file uploads from authenticated users at `POST /api/uploads`, persist the bytes under `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}`, create an `Attachment` row with `messageId = NULL`, and return `{ id, kind, originalName, mime, size }` so the client can attach the id to a subsequent `POST /api/conversations/:id/messages` call.

#### Scenario: Valid file upload succeeds

- **WHEN** an authenticated user sends a multipart request to `POST /api/uploads` with a single `file` part whose size is ≤ 20 MB (or ≤ 3 MB when the mime is `image/*`)
- **THEN** the server streams the bytes to `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}` where `{ext}` is derived from the original filename (defaulting to empty if missing)
- **AND** inserts an `Attachment (id, uploaderId=caller, originalName, storedPath, mime, size, kind, comment=NULL, messageId=NULL, createdAt=now)` row
- **AND** responds `201 Created` with `{ id, kind, originalName, mime, size }`
- **AND** `kind` is `image` when the mime starts with `image/`, otherwise `file`

#### Scenario: Unauthenticated upload is refused

- **WHEN** `POST /api/uploads` is called without a valid session cookie
- **THEN** the server responds `401 Unauthorized`
- **AND** no bytes are written to disk
- **AND** no `Attachment` row is created

#### Scenario: Oversized file is rejected before full buffering

- **WHEN** a multipart upload exceeds 20 MB total
- **THEN** the server responds `413 Payload Too Large`
- **AND** no partial `Attachment` row is persisted
- **AND** any partial bytes on disk are removed before the response

#### Scenario: Oversized image is rejected

- **WHEN** a multipart upload whose declared part mime starts with `image/` exceeds 3 MB
- **THEN** the server responds `413 Payload Too Large`
- **AND** no `Attachment` row is created

### Requirement: Attachments associate with a message at send time

The system SHALL associate staged attachments with a newly created message only when the caller is the original uploader of every `attachmentId` referenced and the attachment is still unassociated (`messageId IS NULL`).

#### Scenario: Message creation claims the attachments

- **WHEN** `POST /api/conversations/:id/messages` is called with `attachmentIds: [a, b]` by the user who uploaded both `a` and `b`
- **THEN** after the message row is created the server updates each listed `Attachment` to set `messageId` to the new message id, inside the same transaction
- **AND** responds `201 Created` with the message payload including the resolved attachments

#### Scenario: Attachment owned by a different user is rejected

- **WHEN** `POST /api/conversations/:id/messages` is called with an `attachmentId` whose `uploaderId` differs from the caller
- **THEN** the server responds `403 Forbidden`
- **AND** no message row is created

#### Scenario: Already-attached attachment is rejected

- **WHEN** `POST /api/conversations/:id/messages` is called with an `attachmentId` whose `messageId` is already non-null
- **THEN** the server responds `409 Conflict`
- **AND** no message row is created

### Requirement: Membership-gated file download

The system SHALL stream attachment bytes at `GET /api/files/:id` only when the caller is, at request time, a member of the room conversation or a participant of the DM conversation that the attachment's message belongs to. Users who were banned from or removed from a room SHALL be treated as non-members immediately. If the parent room or attachment no longer exists because the room was deleted, the endpoint SHALL return `404 Not Found`.

#### Scenario: Member downloads a file

- **WHEN** an authenticated user who is a `RoomMember` of the room backing the attachment's conversation calls `GET /api/files/:id`
- **THEN** the server responds `200 OK` with `Content-Type: <attachment.mime>`, `Content-Length: <attachment.size>`, `Content-Disposition: attachment; filename="<originalName>"` (RFC 5987 encoded)
- **AND** streams the file bytes from `storedPath`

#### Scenario: DM participant downloads a file

- **WHEN** an authenticated user who is a `DmParticipant` of the DM conversation that the attachment's message belongs to calls `GET /api/files/:id`
- **THEN** the server responds `200 OK` and streams the bytes as above

#### Scenario: Banned or removed room user is refused

- **WHEN** an authenticated user who previously had room access but no longer has a current `RoomMember` row calls `GET /api/files/:id`
- **THEN** the server responds `403 Forbidden`
- **AND** no bytes are streamed

#### Scenario: Deleted room attachment returns 404

- **WHEN** `GET /api/files/:id` is called for an attachment whose room and attachment rows were removed by room deletion
- **THEN** the server responds `404 Not Found`

#### Scenario: Staged (unattached) file is not downloadable by others

- **WHEN** a user other than the uploader calls `GET /api/files/:id` while `Attachment.messageId IS NULL`
- **THEN** the server responds `403 Forbidden`

#### Scenario: Uploader can download their own staged file

- **WHEN** the uploader of an attachment calls `GET /api/files/:id` while `Attachment.messageId IS NULL`
- **THEN** the server responds `200 OK` and streams the bytes

### Requirement: Per-attachment optional comment

The system SHALL accept an optional UTF-8 `comment` (≤ 500 bytes) per attachment and return it on the message payload.

#### Scenario: Upload with a comment

- **WHEN** `POST /api/uploads` is called with a multipart `comment` part
- **THEN** the server stores `comment` on the `Attachment` row
- **AND** returns it in the upload response and on every subsequent message payload that includes the attachment

#### Scenario: Oversized comment is rejected

- **WHEN** the `comment` part exceeds 500 bytes of UTF-8
- **THEN** the server responds `400 Bad Request`
- **AND** no `Attachment` row is created

### Requirement: Filesystem layout and persistence

The system SHALL store uploaded files under `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}` on a persistent Docker volume, SHALL never derive the on-disk filename from user input, and SHALL keep files after the uploader loses access to an individual room unless the room itself is deleted.

#### Scenario: On-disk path uses a UUID

- **WHEN** the server writes an uploaded file to disk
- **THEN** the filename stem is a newly generated UUIDv4
- **AND** the extension is taken from the original filename (empty if absent), lowercased, and validated against a simple allowlist of characters `[a-z0-9]`

#### Scenario: Room deletion cascades to files

- **WHEN** a room and its backing conversation are deleted (owner action)
- **THEN** every `Attachment` whose `message.conversationId` equals the deleted conversation is removed from disk and its row deleted

