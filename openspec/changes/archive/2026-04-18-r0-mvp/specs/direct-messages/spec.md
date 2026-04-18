## ADDED Requirements

### Requirement: DM conversation by username

The system SHALL provide an endpoint that returns the DM conversation between the caller and a target user identified by `username`, creating it on first call and reusing it thereafter.

#### Scenario: First call creates the DM conversation

- **WHEN** user A calls `POST /api/dm/:username` with user B's username, and no DM conversation exists between them
- **THEN** the server creates a `Conversation` of `type=dm` with `dmKey` equal to the sorted `userAId:userBId` string
- **AND** creates exactly two `DmParticipant` rows (one per user)
- **AND** responds with `200 OK` and `{ conversationId, peer: { id, username } }`

#### Scenario: Second call reuses the existing conversation

- **WHEN** either participant calls `POST /api/dm/:username` with the other participant's username a second time
- **THEN** the server responds with the same `conversationId` as the first call
- **AND** no new `Conversation` or `DmParticipant` rows are created

#### Scenario: Self-DM is rejected

- **WHEN** a user calls `POST /api/dm/:username` with their own username
- **THEN** the server responds with `400 Bad Request`
- **AND** no rows are created

#### Scenario: Unknown target returns 404

- **WHEN** the target `:username` does not correspond to any `User`
- **THEN** the server responds with `404 Not Found`

#### Scenario: Unauthenticated caller is rejected

- **WHEN** `POST /api/dm/:username` is called without a valid session cookie
- **THEN** the server responds with `401 Unauthorized`

### Requirement: DM contacts listing

The system SHALL expose an endpoint that returns the set of DM peers the current user has an existing DM conversation with, used to render the sidebar "Direct messages" accordion.

#### Scenario: Authenticated user gets their DM peers

- **WHEN** an authenticated user calls `GET /api/me/dm-contacts`
- **THEN** the server responds with `200 OK` and a JSON array of `{ conversationId, peer: { id, username } }` for every DM conversation the caller participates in

### Requirement: Exactly two participants per DM

The system SHALL enforce that every `Conversation` of `type=dm` has exactly two `DmParticipant` rows, with distinct `userId` values.

#### Scenario: Data model prevents additional participants

- **WHEN** the Prisma schema and database constraints are inspected
- **THEN** `DmParticipant (conversationId, userId)` has a compound primary key (or unique index)
- **AND** every code path that inserts a `DmParticipant` does so in the same transaction that creates the `Conversation`, inserting two rows with distinct `userId` values
