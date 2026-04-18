## ADDED Requirements

### Requirement: Friend request lifecycle
The system SHALL let an authenticated user create, accept, decline, and remove friendships with other users. Friendship state SHALL be stored per unique user pair, and only one pending or accepted relationship record may exist for a pair at a time.

#### Scenario: Send a friend request to another user
- **WHEN** user A calls `POST /api/friends/requests` targeting user B, A is not B, there is no accepted friendship for the pair, and neither direction has an active block
- **THEN** the server creates a pending friendship for the sorted pair `(A, B)` with `requestedById = A`
- **AND** responds with `201 Created`
- **AND** publishes `friend.request` to `user:{B}`

#### Scenario: Duplicate pending request is rejected
- **WHEN** a pending friendship already exists for pair `(A, B)` and either user submits another friend request for the same pair
- **THEN** the server responds with `409 Conflict`
- **AND** no second friendship row is created

#### Scenario: Self request is rejected
- **WHEN** a user targets themselves in `POST /api/friends/requests`
- **THEN** the server responds with `400 Bad Request`
- **AND** no friendship row is created

#### Scenario: Blocked pair cannot create a request
- **WHEN** either `A -> B` or `B -> A` exists in `UserBlock` and A calls `POST /api/friends/requests` for B
- **THEN** the server responds with `403 Forbidden`
- **AND** no friendship row is created

#### Scenario: Recipient accepts the request
- **WHEN** user B calls `POST /api/friends/requests/:id/accept` for a pending request that targets B
- **THEN** the friendship status becomes `accepted`
- **AND** the server responds with `200 OK`
- **AND** publishes `friend.accepted` to both `user:{A}` and `user:{B}`

#### Scenario: Recipient declines the request
- **WHEN** user B calls `POST /api/friends/requests/:id/decline` for a pending request that targets B
- **THEN** the pending friendship is removed or marked terminal so it no longer appears as pending
- **AND** the server responds with `204 No Content`

#### Scenario: Non-recipient cannot accept or decline
- **WHEN** a user who is not the target of the pending request calls `POST /api/friends/requests/:id/accept` or `POST /api/friends/requests/:id/decline`
- **THEN** the server responds with `403 Forbidden`
- **AND** the friendship row is unchanged

#### Scenario: Accepted friendship can be removed
- **WHEN** either user in an accepted friendship calls `DELETE /api/friends/:userId` for the other user
- **THEN** the accepted friendship for the pair is removed
- **AND** the server responds with `204 No Content`
- **AND** both users no longer appear as friends in `GET /api/friends`

### Requirement: Blocks terminate friendship and freeze direct messages
The system SHALL let an authenticated user block and unblock another user. An active block in either direction SHALL prevent new friend requests, terminate any accepted friendship for the pair, prevent new DM creation, and freeze any existing DM so its history remains visible but new sends are rejected.

#### Scenario: Block creates frozen DM state
- **WHEN** user A calls `POST /api/blocks` targeting user B and an existing DM conversation between A and B exists
- **THEN** the server creates a `UserBlock (blockerId=A, blockedId=B)` row
- **AND** removes any accepted friendship for pair `(A, B)`
- **AND** responds with `201 Created`
- **AND** publishes `dm.frozen` to both `user:{A}` and `user:{B}`

#### Scenario: Block without an existing DM still prevents future contact
- **WHEN** user A blocks user B and no DM conversation exists yet
- **THEN** the block is persisted
- **AND** future friend requests and new DM creation attempts for the pair are rejected while the block remains active

#### Scenario: Duplicate block is idempotent
- **WHEN** user A calls `POST /api/blocks` for user B and `UserBlock (A, B)` already exists
- **THEN** the server responds with success without creating a duplicate row

#### Scenario: Unblock removes the active block
- **WHEN** user A calls `DELETE /api/blocks/:userId` for previously blocked user B
- **THEN** the `UserBlock (A, B)` row is removed
- **AND** the server responds with `204 No Content`
- **AND** the pair may create new friend requests or use an existing grandfathered DM again if no other active block remains

### Requirement: Contacts endpoint returns social state
The system SHALL expose a contacts endpoint that returns the caller's accepted friends, pending inbound requests, pending outbound requests, and blocked users so the contacts screen can render all social state from one snapshot.

#### Scenario: Contacts endpoint returns categorized relationships
- **WHEN** an authenticated user calls `GET /api/friends`
- **THEN** the server responds with `200 OK`
- **AND** the payload includes separate collections for accepted friends, inbound pending requests, outbound pending requests, and blocked users

#### Scenario: Contacts view includes peer identity information
- **WHEN** `GET /api/friends` returns any relationship row
- **THEN** each entry includes the peer user's id and username
- **AND** accepted friends additionally include the current aggregate presence status needed by the contacts UI
