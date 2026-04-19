## MODIFIED Requirements

### Requirement: DM contacts listing

The system SHALL expose an endpoint that returns the set of DM peers the current user has an existing DM conversation with, used to render the sidebar "Direct messages" accordion.

#### Scenario: Authenticated user gets their DM peers

- **WHEN** an authenticated user calls `GET /api/me/dm-contacts`
- **THEN** the server responds with `200 OK` and a JSON array of `{ conversationId, peer: { id, username, avatarUrl } }` for every DM conversation the caller participates in
- **AND** `avatarUrl` is the peer user's avatar URL or JSON `null` when unset
