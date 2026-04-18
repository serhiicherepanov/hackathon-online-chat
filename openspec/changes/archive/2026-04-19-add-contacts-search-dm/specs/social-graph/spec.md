## ADDED Requirements

### Requirement: Contacts page search filter

The contacts page SHALL provide a single search input that filters the **Friends**, **Incoming requests**, **Outgoing requests**, and **Blocked** sections by a case-insensitive substring match against the peer's `username`.

#### Scenario: Typing narrows every section

- **WHEN** the user types `ali` into the contacts search box
- **THEN** each of the four sections renders only rows whose peer username contains `ali` (case-insensitive)
- **AND** sections with zero matches render their normal empty-state copy

#### Scenario: Clearing the search restores the full lists

- **WHEN** the user clears the search input
- **THEN** every row originally present in the `/api/friends` payload is rendered again in its respective section

### Requirement: Click-to-DM from friend rows

The contacts page SHALL make each accepted-friend row activatable; activating it SHALL create (if needed) and open the DM conversation with that friend.

#### Scenario: Clicking a friend row opens the DM

- **WHEN** an authenticated user clicks the row for friend `bob` on `/contacts`
- **THEN** the client calls `POST /api/dm/bob` and navigates to `/dm/:conversationId` with the returned id
- **AND** on a subsequent click the same `conversationId` is reused (no duplicate DMs)

### Requirement: Friend request accepts user id, username, or email

The `POST /api/friends/requests` endpoint SHALL accept a body of `{ identifier: string }` (with legacy `{ userId: string }` as an alias) where `identifier` is resolved against `User` by id, then by `email` if it contains `@`, otherwise by `username`.

#### Scenario: Inviting by email resolves to the matching user

- **WHEN** an authenticated user posts `{ "identifier": "bob@example.com" }` to `/api/friends/requests`
- **AND** a `User` exists with that email
- **THEN** the server creates a pending `Friendship` between the caller and that user
- **AND** responds `201 Created` with `{ friendshipId, peer: { id, username } }`

#### Scenario: Inviting by username resolves to the matching user

- **WHEN** an authenticated user posts `{ "identifier": "bob" }` and no user id matches but a user with `username = "bob"` exists
- **THEN** the server creates a pending `Friendship` with that user and responds `201 Created`

#### Scenario: Unknown identifier returns 404 with a generic error

- **WHEN** the identifier matches no user by id, email, or username
- **THEN** the server responds `404 Not Found` with `{ "error": "user_not_found" }`
- **AND** the response body is identical regardless of which lookup branch was taken (no enumeration signal)

#### Scenario: Legacy userId body is still accepted

- **WHEN** a client posts the legacy shape `{ "userId": "<cuid>" }`
- **THEN** the server treats it as `{ "identifier": "<cuid>" }` and returns the same response as the new shape

### Requirement: Contacts page request form accepts any identifier

The "Send a friend request" form on the contacts page SHALL accept a user id, username, or email in its single input and submit it as `{ identifier }` to `POST /api/friends/requests`.

#### Scenario: Form submits email as identifier

- **WHEN** the user types `bob@example.com` into the request form and submits
- **THEN** the client posts `{ "identifier": "bob@example.com" }` to `/api/friends/requests`
- **AND** on success the input is cleared and the outbound-requests section refreshes to include the new request
