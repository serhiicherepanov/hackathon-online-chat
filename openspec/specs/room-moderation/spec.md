# room-moderation Specification

## Purpose

Defines R3 room-governance behavior: room-scoped roles, private-room invitations, bans, member removal, and the permission boundaries between owners, admins, and regular members.

## Requirements

### Requirement: Room roles and moderation permissions

The system SHALL support room-scoped roles `owner`, `admin`, and `member`. The owner SHALL have full room control, admins SHALL be able to moderate membership and room messages, and members SHALL have no moderation privileges.

#### Scenario: Owner grants admin to a member

- **WHEN** the room owner calls `POST /api/rooms/:id/admins/:userId` for a current member
- **THEN** the server updates that member's `RoomMember.role` to `admin`
- **AND** responds with `200 OK` and the updated member record
- **AND** publishes a `role.changed` event for the room

#### Scenario: Admin cannot change the owner's role

- **WHEN** any caller attempts to demote, remove, or otherwise change the `owner` role through the admin-management API
- **THEN** the server responds with `403 Forbidden`
- **AND** the owner's `RoomMember` row remains unchanged

#### Scenario: Non-admin cannot moderate the room

- **WHEN** a caller whose room role is `member` tries to grant admin, revoke admin, remove a user, or ban a user
- **THEN** the server responds with `403 Forbidden`
- **AND** no moderation state changes are persisted

### Requirement: Private-room invitations

The system SHALL allow the owner or an admin of a private room to invite a registered user by username, creating at most one pending invite per `(roomId, inviteeId)` pair. Invitees SHALL be able to accept or decline pending invites from their own inbox.

#### Scenario: Admin invites a user to a private room

- **WHEN** an owner or admin calls `POST /api/rooms/:id/invites` with `{ "username": "alice" }` for a private room and `alice` is neither a current member nor banned
- **THEN** the server creates a `RoomInvite` row with `status = pending`
- **AND** responds with `201 Created` and the invite metadata
- **AND** publishes `room.invited` on `user:{aliceId}`

#### Scenario: Accepting an invite creates membership

- **WHEN** the invitee calls `POST /api/invites/:id/accept` for a pending invite and the room still exists and the invitee is not banned
- **THEN** the server marks the invite as `accepted`
- **AND** creates a `RoomMember` row with `role = member` in the same transaction
- **AND** responds with `200 OK` and the room summary needed by the sidebar

#### Scenario: Banned user cannot accept an invite

- **WHEN** the invitee calls `POST /api/invites/:id/accept` for a room that now has an active `RoomBan` row for them
- **THEN** the server responds with `403 Forbidden`
- **AND** the invite remains unresolved or is marked unusable
- **AND** no `RoomMember` row is created

#### Scenario: Duplicate pending invite is rejected

- **WHEN** an owner or admin tries to create an invite for a user who already has a pending invite to the same room
- **THEN** the server responds with `409 Conflict`
- **AND** no second pending invite row is created

### Requirement: Room bans and member removal

The system SHALL let the owner or an admin ban a room member or non-member, and SHALL let the owner or an admin remove a current member by creating or preserving a room-level ban. A banned user SHALL lose room access immediately and SHALL NOT be able to rejoin until unbanned.

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

#### Scenario: Owner cannot be banned

- **WHEN** any caller attempts to ban the room owner
- **THEN** the server responds with `403 Forbidden`
- **AND** no `RoomBan` row is created

#### Scenario: Unban restores eligibility but not membership

- **WHEN** an owner or admin calls `DELETE /api/rooms/:id/bans/:userId` for an existing room ban
- **THEN** the server deletes the `RoomBan` row
- **AND** responds with `204 No Content`
- **AND** the user remains a non-member until they accept an invite or join through the normal room flow
