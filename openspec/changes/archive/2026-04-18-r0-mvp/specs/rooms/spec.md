## ADDED Requirements

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

The system SHALL allow any authenticated user to join a `public` room they are not already a member of, and SHALL be idempotent.

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

The system SHALL allow the `owner` of a room to delete the room; deletion SHALL cascade and remove the `Room`, its `Conversation`, all `RoomMember` rows, all `Message` rows in the conversation, and all `MessageRead` rows for the conversation.

#### Scenario: Owner deletes a room

- **WHEN** the owner calls `DELETE /api/rooms/:id`
- **THEN** the server deletes the `Room`, its `Conversation`, and all related `RoomMember`, `Message`, and `MessageRead` rows in a single transaction
- **AND** responds with `204 No Content`

#### Scenario: Non-owner deletion is forbidden

- **WHEN** a member with `role=member` calls `DELETE /api/rooms/:id`
- **THEN** the server responds with `403 Forbidden`
- **AND** no rows are deleted

#### Scenario: Unknown room returns 404

- **WHEN** `DELETE /api/rooms/:id` is called for an id that does not exist
- **THEN** the server responds with `404 Not Found`

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
