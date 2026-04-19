## MODIFIED Requirements

### Requirement: Session-backed Centrifugo connect token

The system SHALL issue Centrifugo connection tokens only to callers that are authenticated by the web app, in both development and production, and SHALL identify the token by the authenticated user's id. Token issuance SHALL remain valid when the browser app and Centrifugo are hosted on separate domains.

#### Scenario: Authenticated caller gets a token

- **WHEN** an authenticated user calls `POST /api/centrifugo/connect`
- **THEN** the server responds with `200 OK` and `{ "token": "<jws>" }`
- **AND** the token is an HS256 JWT signed with `CENTRIFUGO_TOKEN_HMAC_SECRET`
- **AND** the token's `sub` claim equals the authenticated user's id
- **AND** the token's `exp` claim is within 10 minutes of issuance

#### Scenario: Unauthenticated caller is refused

- **WHEN** `POST /api/centrifugo/connect` is called without valid web authentication
- **THEN** the server responds with `401 Unauthorized`
- **AND** no token is issued

### Requirement: Subscribe-proxy authorization for channels

Centrifugo SHALL delegate subscribe authorization to the Next.js app via a subscribe proxy. The app SHALL allow or reject subscriptions based on the conversation membership or user-identity rules below, and SHALL NOT require forwarded browser cookies as the identity mechanism for this authorization.

#### Scenario: Room channel requires membership

- **WHEN** Centrifugo calls the subscribe proxy for channel `room:{conversationId}` on behalf of user U
- **THEN** the app allows the subscription iff there exists a `RoomMember` row whose `roomId` points to the room backing that conversation and `userId=U`
- **AND** otherwise responds with an error that Centrifugo translates to a subscribe rejection

#### Scenario: DM channel requires participation

- **WHEN** Centrifugo calls the subscribe proxy for channel `dm:{conversationId}` on behalf of user U
- **THEN** the app allows the subscription iff a `DmParticipant (conversationId, userId=U)` row exists

#### Scenario: User channel requires identity match

- **WHEN** Centrifugo calls the subscribe proxy for channel `user:{targetId}` on behalf of user U
- **THEN** the app allows the subscription iff `U == targetId`

#### Scenario: Presence channel is open to authenticated users

- **WHEN** Centrifugo calls the subscribe proxy for channel `presence` on behalf of user U
- **THEN** the app allows the subscription for any authenticated user U

### Requirement: Client connects and resubscribes on reconnect

The browser SHALL use `centrifuge-js` to connect to `NEXT_PUBLIC_CENTRIFUGO_WS_URL`, using app-issued short-lived tokens, and SHALL automatically refresh tokens, reconnect, and resubscribe on transient failures.

#### Scenario: Client reaches connected state on sign-in

- **WHEN** an authenticated user loads the app shell
- **THEN** the Centrifugo client instance transitions from `disconnected` to `connected` within 5 seconds, using a token fetched from `POST /api/centrifugo/connect`

#### Scenario: Active-room subscriptions are re-established on reconnect

- **WHEN** the Centrifugo connection drops and recovers
- **THEN** all subscriptions that were active at the moment of drop are re-requested automatically, each going through the subscribe proxy

#### Scenario: Expired connection token is refreshed

- **WHEN** the current Centrifugo connection token expires while the browser session is still authenticated
- **THEN** `centrifuge-js` fetches a fresh token from the app endpoint
- **AND** the client remains connected or reconnects without requiring full user sign-in
