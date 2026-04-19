## MODIFIED Requirements

### Requirement: Membership-gated file download

The system SHALL stream attachment bytes at `GET /api/files/:id` only when the caller is, at request time, a member of the room conversation or a participant of the DM conversation that the attachment's message belongs to. Users who were banned from or removed from a room SHALL be treated as non-members immediately. If the parent room or attachment no longer exists because the room was deleted, the endpoint SHALL return `404 Not Found`.

#### Scenario: Member downloads a file

- **WHEN** an authenticated user who is a `RoomMember` of the room backing the attachment's conversation calls `GET /api/files/:id`
- **THEN** the server responds `200 OK` with `Content-Type: <attachment.mime>`, `Content-Length: <attachment.size>`, `Content-Disposition: attachment; filename=\"<originalName>\"` (RFC 5987 encoded)
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
