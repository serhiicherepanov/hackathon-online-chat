## MODIFIED Requirements

### Requirement: Room bans and member removal

The system SHALL let the owner or an admin remove a current member without creating a room ban, and SHALL let the owner or an admin ban a room member or non-member. A banned user SHALL lose room access immediately and SHALL NOT be able to rejoin until unbanned.

#### Scenario: Admin removes a current member without banning

- **WHEN** an owner or admin calls `DELETE /api/rooms/:id/members/:userId` for a current member who is not the owner
- **THEN** the server deletes that user's `RoomMember` row
- **AND** does not create or modify a `RoomBan` row for that user
- **AND** responds with `204 No Content`
- **AND** publishes `room.access.revoked` on `user:{userId}` with reason `removed`

#### Scenario: Admin bans a current member

- **WHEN** an owner or admin calls `POST /api/rooms/:id/bans/:userId` for a current member who is not the owner
- **THEN** the server creates a `RoomBan` row if one does not already exist
- **AND** deletes that user's `RoomMember` row in the same transaction
- **AND** responds with `200 OK`
- **AND** publishes `member.banned` on the room channel and `room.access.revoked` on `user:{userId}`

#### Scenario: Banned user cannot rejoin a public room

- **WHEN** a banned user calls `POST /api/rooms/:id/join` for a public room
- **THEN** the server responds with `403 Forbidden`
- **AND** no `RoomMember` row is created

#### Scenario: Owner cannot be removed or banned

- **WHEN** any caller attempts to remove or ban the room owner through member-removal or ban APIs
- **THEN** the server responds with `403 Forbidden`
- **AND** the owner's `RoomMember` row remains unchanged
- **AND** no `RoomBan` row is created for the owner

#### Scenario: Unban restores eligibility but not membership

- **WHEN** an owner or admin calls `DELETE /api/rooms/:id/bans/:userId` for an existing room ban
- **THEN** the server deletes the `RoomBan` row
- **AND** responds with `204 No Content`
- **AND** the user remains a non-member until they accept an invite or join through the normal room flow
