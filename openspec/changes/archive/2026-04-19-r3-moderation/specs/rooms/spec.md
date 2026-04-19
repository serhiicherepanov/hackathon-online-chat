## MODIFIED Requirements

### Requirement: Join a public room

The system SHALL allow any authenticated user to join a `public` room they are not already a member of, and SHALL be idempotent, unless the user has an active room ban for that room.

#### Scenario: First join creates a member row

- **WHEN** an authenticated non-member calls `POST /api/rooms/:id/join` for a public room
- **THEN** the server creates a `RoomMember (roomId, userId, role=member)` row
- **AND** responds with `200 OK` and the updated `memberCount`

#### Scenario: Joining when already a member is a no-op success

- **WHEN** an existing member calls `POST /api/rooms/:id/join`
- **THEN** the server responds with `200 OK`
- **AND** no new `RoomMember` row is created

#### Scenario: Cannot join a private room via catalog

- **WHEN** a non-member calls `POST /api/rooms/:id/join` on a `private` room
- **THEN** the server responds with `403 Forbidden`
- **AND** no `RoomMember` row is created

#### Scenario: Banned user cannot join

- **WHEN** a user with an active `RoomBan` for the target room calls `POST /api/rooms/:id/join`
- **THEN** the server responds with `403 Forbidden`
- **AND** no `RoomMember` row is created

### Requirement: Owner-only room deletion

The system SHALL allow the `owner` of a room to delete the room; deletion SHALL cascade and remove the `Room`, its `Conversation`, all `RoomMember` rows, all `Message` rows in the conversation, all `MessageRead` rows for the conversation, all room invites and bans, and every attachment row and on-disk file for that room.

#### Scenario: Owner deletes a room

- **WHEN** the owner calls `DELETE /api/rooms/:id`
- **THEN** the server deletes the `Room`, its `Conversation`, and all related `RoomMember`, `Message`, `MessageRead`, `RoomInvite`, `RoomBan`, and `Attachment` rows in a single transaction
- **AND** after commit removes the deleted room's attachment files from disk
- **AND** responds with `204 No Content`

#### Scenario: Non-owner deletion is forbidden

- **WHEN** a member with `role=member` or `role=admin` calls `DELETE /api/rooms/:id`
- **THEN** the server responds with `403 Forbidden`
- **AND** no rows are deleted

#### Scenario: Unknown room returns 404

- **WHEN** `DELETE /api/rooms/:id` is called for an id that does not exist
- **THEN** the server responds with `404 Not Found`

## ADDED Requirements

### Requirement: Owner can update room settings
The system SHALL allow only the room owner to update a room's name, description, and visibility through `PATCH /api/rooms/:id`.

#### Scenario: Owner updates room metadata
- **WHEN** the owner calls `PATCH /api/rooms/:id` with a valid unique `name`, optional `description`, and `visibility`
- **THEN** the server persists the updated values
- **AND** responds with `200 OK` and the updated room summary

#### Scenario: Admin cannot update owner-only settings
- **WHEN** a caller whose room role is `admin` or `member` calls `PATCH /api/rooms/:id`
- **THEN** the server responds with `403 Forbidden`
- **AND** the room metadata remains unchanged
