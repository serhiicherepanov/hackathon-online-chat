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

The system SHALL publish Centrifugo events only after the originating Postgres transaction has committed, so that any event received by a client corresponds to state that is already queryable via the REST endpoints or derivable from committed business state.

#### Scenario: Publish happens post-commit for messages

- **WHEN** `POST /api/conversations/:id/messages` succeeds
- **THEN** the `Message` row is committed to Postgres BEFORE the server calls the Centrifugo HTTP API to publish `message.created`
- **AND** if the Centrifugo publish call fails, the response to the client is still `201 Created` (the message is persisted) and the failure is logged

#### Scenario: Publish happens post-commit for friend acceptance

- **WHEN** a pending friendship is accepted
- **THEN** the friendship row is committed with `status = accepted` BEFORE the server publishes `friend.accepted`
- **AND** if the publish call fails, the HTTP mutation still succeeds and the failure is logged

#### Scenario: Publish happens post-commit for block-driven DM freeze

- **WHEN** a user block is created or removed
- **THEN** the block row mutation is committed BEFORE the server publishes any `dm.frozen`, `block.created`, or `block.removed` event

### Requirement: Channel naming

The system SHALL use the following channel names, and no others, for R3 fan-out.

- `room:{conversationId}` — events for room conversations (`message.created`, `message.updated`, `message.deleted`, `typing`, `member.joined`, `member.left`, `member.banned`, `role.changed`, `room.updated`, `room.deleted`)
- `dm:{conversationId}` — events for DM conversations (`message.created`, `message.updated`, `message.deleted`, `typing`)
- `user:{userId}` — per-user events (`unread.changed`, `presence.changed`, `friend.request`, `friend.accepted`, `friend.removed`, `block.created`, `block.removed`, `dm.frozen`, `room.invited`, `room.access.revoked`, `room.deleted`)
- `presence` — broadcast `presence.changed` events to all authenticated clients

#### Scenario: Channel names are derived from conversation id, not room id

- **WHEN** the server publishes a room conversation event
- **THEN** the channel name uses the `Conversation.id`, not the `Room.id`

#### Scenario: Updated and deleted events use the same channel as created

- **WHEN** a message is edited or soft-deleted
- **THEN** the `message.updated` or `message.deleted` event is published on the same `room:{convId}` or `dm:{convId}` channel that carried the original `message.created`

### Requirement: Room moderation event contract

The system SHALL publish room moderation and invitation events only after the corresponding database transaction commits, and SHALL use them to keep sidebars, room views, and invite inboxes in sync without a full reload.

#### Scenario: Invite creation notifies the invitee

- **WHEN** `POST /api/rooms/:id/invites` succeeds
- **THEN** the server publishes `room.invited` on `user:{inviteeId}` with the invite id, room summary, and inviter identity

#### Scenario: Ban revokes room access live

- **WHEN** a room ban or moderator removal succeeds for user U in room conversation C
- **THEN** the server publishes `member.banned` on `room:{C}` for remaining room participants
- **AND** publishes `room.access.revoked` on `user:{U}` with the room and conversation identifiers
- **AND** best-effort unsubscribes U from `room:{C}` via the Centrifugo server API

#### Scenario: Role change updates room subscribers

- **WHEN** the owner grants or revokes admin status for a room member
- **THEN** the server publishes `role.changed` on `room:{conversationId}` with the target user id and new role

#### Scenario: Room deletion notifies all affected users

- **WHEN** `DELETE /api/rooms/:id` succeeds
- **THEN** the server publishes `room.deleted` on `room:{conversationId}` and on each former member's `user:{userId}` channel

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

### Requirement: Typing event contract

The system SHALL publish ephemeral `typing` payloads on room and DM conversation channels, with enough data for subscribers to identify the typist and conversation and to expire stale indicators locally.

#### Scenario: Typing payload is published for a room

- **WHEN** an authenticated room participant emits a typing update for conversation C
- **THEN** the server publishes `typing` on `room:{C}` with at least `{ type: "typing", conversationId: C, userId, username, sentAt }`

#### Scenario: Typing payload is published for a DM

- **WHEN** an authenticated DM participant emits a typing update for conversation C and the DM is not frozen
- **THEN** the server publishes `typing` on `dm:{C}` with at least `{ type: "typing", conversationId: C, userId, username, sentAt }`

#### Scenario: Unauthorized typing publish is rejected

- **WHEN** a user attempts to publish typing for a conversation they are not allowed to post in
- **THEN** the server rejects the request
- **AND** no `typing` event is published

### Requirement: Social notification event contract

The system SHALL publish user-scoped social events that let clients update contacts, frozen DMs, and relationship banners without a full reload.

#### Scenario: Incoming friend request notifies the recipient

- **WHEN** user A creates a friend request targeting user B
- **THEN** the server publishes `friend.request` on `user:{B}` with the request id and requester identity

#### Scenario: Accepted friendship notifies both users

- **WHEN** a pending friendship between A and B is accepted
- **THEN** the server publishes `friend.accepted` to `user:{A}` and `user:{B}` with the peer identity and friendship id

#### Scenario: Block freezes an existing DM for both participants

- **WHEN** a block is created for a pair that already has a DM conversation
- **THEN** the server publishes `dm.frozen` on `user:{A}` and `user:{B}` with the affected `conversationId` and the frozen state
