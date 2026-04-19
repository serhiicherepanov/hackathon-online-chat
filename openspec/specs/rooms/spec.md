# rooms Specification

## Purpose

Defines R0 rooms: creation with a globally unique name, public/private visibility, the public catalog with case-insensitive name search and per-caller `isMember` flags, join (public only, idempotent), leave (non-owners only), owner-only deletion with full cascade (room, conversation, memberships, messages, reads), the `GET /api/me/rooms` listing for the sidebar, and the `GET /api/rooms/:id/members` listing for the members panel.

## Requirements

### Requirement: Room creation with unique name

The system SHALL allow any authenticated user to create a room by providing a `name` (unique across all rooms), an optional `description`, and a `visibility` of `public` or `private`, and SHALL make the creator the room's `owner` and an automatic member.

#### Scenario: Creator becomes owner and member

- **WHEN** an authenticated user calls `POST /api/rooms` with a valid name, description, and `visibility`
- **THEN** the server creates a `Conversation` of `type=room` and a `Room` row linked to it
- **AND** creates a `RoomMember` row for the creator with `role=owner`
- **AND** responds with `201 Created` and the new room's id, name, description, visibility, and memberCount=1

#### Scenario: Duplicate room name is rejected

- **WHEN** `POST /api/rooms` is called with a name that already exists on another `Room`
- **THEN** the server responds with `409 Conflict`
- **AND** no `Room`, `Conversation`, or `RoomMember` row is created

#### Scenario: Invalid input is rejected

- **WHEN** `POST /api/rooms` is called with a missing name, a name longer than 64 characters, a description longer than 280 characters, or a `visibility` that is neither `public` nor `private`
- **THEN** the server responds with `400 Bad Request`
- **AND** no rows are created

#### Scenario: Unauthenticated caller cannot create a room

- **WHEN** `POST /api/rooms` is called without a valid session cookie
- **THEN** the server responds with `401 Unauthorized`

### Requirement: Public room catalog with search

The system SHALL expose a catalog endpoint that lists `public` rooms with member counts and optional name search, and SHALL NOT include `private` rooms in the catalog.

#### Scenario: Listing public rooms returns membership counts

- **WHEN** an authenticated user calls `GET /api/rooms`
- **THEN** the server responds with `200 OK` and a JSON array of public rooms, each containing id, name, description, memberCount, and a boolean `isMember` flag for the caller

#### Scenario: Search filters by case-insensitive substring

- **WHEN** `GET /api/rooms?search=gen` is called
- **THEN** the response contains only public rooms whose `name` contains `gen` case-insensitively

#### Scenario: Private rooms are hidden from the catalog

- **WHEN** the catalog is fetched by a user who is NOT a member of a `private` room P
- **THEN** room P does not appear in the response, regardless of `search`

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

### Requirement: Leave a room (non-owners)

The system SHALL allow any `member` (non-owner) to leave a room, and SHALL reject leave attempts from the `owner`.

#### Scenario: Member leaves successfully

- **WHEN** a user with `role=member` calls `POST /api/rooms/:id/leave`
- **THEN** the server deletes their `RoomMember` row
- **AND** responds with `204 No Content`

#### Scenario: Owner cannot leave

- **WHEN** a user with `role=owner` calls `POST /api/rooms/:id/leave`
- **THEN** the server responds with `409 Conflict` with an error code indicating "owner_cannot_leave"
- **AND** the `RoomMember` row is NOT deleted

#### Scenario: Non-member leaving is rejected

- **WHEN** a user who is not a member calls `POST /api/rooms/:id/leave`
- **THEN** the server responds with `404 Not Found`

### Requirement: Owner-only room deletion

The system SHALL allow the `owner` of a room to delete the room; deletion SHALL cascade and remove the `Room`, its `Conversation`, all `RoomMember` rows, all `Message` rows in the conversation, all `MessageRead` rows for the conversation, all room invites and bans, and every attachment row and on-disk file for that room.

#### Scenario: Owner deletes a room

- **WHEN** the owner calls `DELETE /api/rooms/:id`
- **THEN** the server deletes the `Room`, its `Conversation`, and all related `RoomMember`, `Message`, `MessageRead`, `RoomInvite`, `RoomBan`, and `Attachment` rows in a single transaction
- **AND** after commit removes the deleted room's attachment files from disk
- **AND** responds with `204 No Content`

#### Scenario: Non-owner deletion is forbidden

- **WHEN** a member with `role=member` calls `DELETE /api/rooms/:id`
- **THEN** the server responds with `403 Forbidden`
- **AND** no rows are deleted

#### Scenario: Unknown room returns 404

- **WHEN** `DELETE /api/rooms/:id` is called for an id that does not exist
- **THEN** the server responds with `404 Not Found`

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

### Requirement: My-rooms listing

The system SHALL expose an endpoint that returns the rooms the current user is a member of, used to render the sidebar.

#### Scenario: Authenticated user gets their memberships

- **WHEN** an authenticated user calls `GET /api/me/rooms`
- **THEN** the server responds with `200 OK` and a JSON array of `{ id, name, visibility, role }` for every `RoomMember` row of that user

### Requirement: Room members listing

The system SHALL expose an endpoint that returns the members of a room (id, username, role) to a caller who is themselves a member, so the members panel can render the list.

#### Scenario: Member lists room participants

- **WHEN** a room member calls `GET /api/rooms/:id/members`
- **THEN** the server responds with `200 OK` and a JSON array of `{ userId, username, role }` for every `RoomMember` of that room

#### Scenario: Non-member cannot list members

- **WHEN** a non-member calls `GET /api/rooms/:id/members`
- **THEN** the server responds with `403 Forbidden` for private rooms, or `200 OK` for public rooms (read-only observability is acceptable for public rooms)

### Requirement: Room member rows expose identity and friend actions

The room members panel SHALL expose convenient actions for visible users without leaving the room. Each rendered member row SHALL make the surfaced `userId` copyable by click with immediate success feedback, and SHALL offer an "Add friend" action for visible users who are not the caller and do not already have an accepted or pending friendship relationship with the caller.

#### Scenario: Clicking a visible user id copies it

- **WHEN** the user clicks the rendered `userId` for a member row in the room members panel
- **THEN** the client copies that `userId` to the clipboard
- **AND** the UI shows immediate confirmation that the copy succeeded

#### Scenario: Add friend is available for an unrelated room member

- **WHEN** the caller views a member row for another visible user who is neither already a friend nor part of a pending friend request with the caller
- **THEN** the row renders an "Add friend" action
- **AND** activating it calls `POST /api/friends/requests` for that target user and updates the row to reflect the pending state without leaving the room

#### Scenario: Friend action is hidden when it is not applicable

- **WHEN** the member row belongs to the caller, an existing friend, or a user with an already-pending request in either direction
- **THEN** the room members panel does not render the "Add friend" action for that row
