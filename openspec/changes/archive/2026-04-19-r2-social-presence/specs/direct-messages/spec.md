## MODIFIED Requirements

### Requirement: DM conversation by username
The system SHALL provide an endpoint that returns the DM conversation between the caller and a target user identified by `username`. The endpoint SHALL create a new DM conversation only when the pair has an accepted friendship and neither direction has an active block; if a DM conversation already exists, the endpoint SHALL reuse it rather than attempting to create a new one.

#### Scenario: First call creates the DM conversation for friends
- **WHEN** user A calls `POST /api/dm/:username` with user B's username, no DM conversation exists between them, they are accepted friends, and neither `A -> B` nor `B -> A` is blocked
- **THEN** the server creates a `Conversation` of `type=dm` with `dmKey` equal to the sorted `userAId:userBId` string
- **AND** creates exactly two `DmParticipant` rows (one per user)
- **AND** responds with `200 OK` and `{ conversationId, peer: { id, username } }`

#### Scenario: Second call reuses the existing conversation
- **WHEN** either participant calls `POST /api/dm/:username` with the other participant's username a second time
- **THEN** the server responds with the same `conversationId` as the first call
- **AND** no new `Conversation` or `DmParticipant` rows are created

#### Scenario: Existing grandfathered DM is still returned
- **WHEN** user A calls `POST /api/dm/:username` for user B, a DM conversation between them already exists from R0 or R1, and the pair is not currently friends
- **THEN** the server responds with the existing `conversationId`
- **AND** does not require a friendship backfill to reuse that DM

#### Scenario: New DM without friendship is rejected
- **WHEN** user A calls `POST /api/dm/:username` for user B, no DM conversation exists yet, and the pair does not have an accepted friendship
- **THEN** the server responds with `403 Forbidden`
- **AND** no `Conversation` or `DmParticipant` rows are created

#### Scenario: New DM is rejected when either side is blocked
- **WHEN** user A calls `POST /api/dm/:username` for user B, no DM conversation exists yet, and either `A -> B` or `B -> A` has an active block
- **THEN** the server responds with `403 Forbidden`
- **AND** no `Conversation` or `DmParticipant` rows are created

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
