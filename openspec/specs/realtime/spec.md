# realtime Specification

## Purpose

Defines the R0 realtime transport contract between the Next.js app and Centrifugo: session-backed connect tokens (both dev and production require a valid web session), a subscribe-proxy that authorizes `room:`, `dm:`, `user:`, and `presence` channels based on conversation membership or identity, server-side publish only after the originating Postgres transaction commits, a fixed channel naming scheme, and a `centrifuge-js` client that automatically reconnects and resubscribes on transient failures.
## Requirements
### Requirement: Session-backed Centrifugo connect token

The system SHALL issue Centrifugo connection tokens only to callers that present a valid web session cookie, in both development and production, and SHALL identify the token by the session's user id.

#### Scenario: Authenticated caller gets a token

- **WHEN** an authenticated user calls `POST /api/centrifugo/connect`
- **THEN** the server responds with `200 OK` and `{ "token": "<jws>" }`
- **AND** the token is an HS256 JWT signed with `CENTRIFUGO_TOKEN_HMAC_SECRET`
- **AND** the token's `sub` claim equals the authenticated user's id
- **AND** the token's `exp` claim is within 10 minutes of issuance

#### Scenario: Unauthenticated caller is refused

- **WHEN** `POST /api/centrifugo/connect` is called without a valid session cookie
- **THEN** the server responds with `401 Unauthorized`
- **AND** no token is issued

### Requirement: Subscribe-proxy authorization for channels

Centrifugo SHALL delegate subscribe authorization to the Next.js app via a subscribe proxy. The app SHALL allow or reject subscriptions based on the conversation membership or user-identity rules below.

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

### Requirement: Server-side publish after DB commit

The system SHALL publish Centrifugo events only after the originating Postgres transaction has committed, so that any event received by a client corresponds to state that is already queryable via the history endpoints.

#### Scenario: Publish happens post-commit for messages

- **WHEN** `POST /api/conversations/:id/messages` succeeds
- **THEN** the `Message` row is committed to Postgres BEFORE the server calls the Centrifugo HTTP API to publish `message.created`
- **AND** if the Centrifugo publish call fails, the response to the client is still `201 Created` (the message is persisted) and the failure is logged

### Requirement: Channel naming

The system SHALL use the following channel names, and no others, for R1 fan-out.

- `room:{conversationId}` — events for room conversations (`message.created`, `message.updated`, `message.deleted`)
- `dm:{conversationId}` — events for DM conversations (`message.created`, `message.updated`, `message.deleted`)
- `user:{userId}` — per-user events (`unread.changed`, `presence.changed`)
- `presence` — broadcast `presence.changed` events to all authenticated clients

#### Scenario: Channel names are derived from conversation id, not room id

- **WHEN** the server publishes a room message event
- **THEN** the channel name uses the `Conversation.id`, not the `Room.id`

#### Scenario: Updated and deleted events use the same channel as created

- **WHEN** a message is edited or soft-deleted
- **THEN** the `message.updated` or `message.deleted` event is published on the same `room:{convId}` or `dm:{convId}` channel that carried the original `message.created`

### Requirement: Client connects and resubscribes on reconnect

The browser SHALL use `centrifuge-js` to connect to `NEXT_PUBLIC_CENTRIFUGO_WS_URL`, using the session-backed token, and SHALL automatically reconnect and resubscribe on transient failures.

#### Scenario: Client reaches connected state on sign-in

- **WHEN** an authenticated user loads the app shell
- **THEN** the Centrifugo client instance transitions from `disconnected` to `connected` within 5 seconds, using a token fetched from `POST /api/centrifugo/connect`

#### Scenario: Active-room subscriptions are re-established on reconnect

- **WHEN** the Centrifugo connection drops and recovers
- **THEN** all subscriptions that were active at the moment of drop are re-requested automatically, each going through the subscribe proxy

### Requirement: `message.updated` event contract

The system SHALL publish `message.updated` on the message's conversation channel after the edit transaction commits, carrying the full updated message payload (same shape as `message.created`).

#### Scenario: Edit publishes updated event

- **WHEN** `PATCH /api/messages/:id` succeeds
- **THEN** the server publishes `message.updated` on `room:{convId}` or `dm:{convId}` with the updated message payload including `editedAt`
- **AND** if the Centrifugo publish call fails, the API response is still `200 OK` and the failure is logged

### Requirement: `message.deleted` event contract

The system SHALL publish `message.deleted` on the message's conversation channel after the soft-delete transaction commits, carrying a compact payload `{ id, conversationId, deletedAt }`.

#### Scenario: Delete publishes deleted event

- **WHEN** `DELETE /api/messages/:id` succeeds on a non-deleted message
- **THEN** the server publishes `message.deleted` on `room:{convId}` or `dm:{convId}` with `{ id, conversationId, deletedAt }`
- **AND** if the Centrifugo publish call fails, the API response is still `204 No Content` and the failure is logged

