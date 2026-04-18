## MODIFIED Requirements

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
The system SHALL use the following channel names, and no others, for R2 fan-out.

- `room:{conversationId}` — events for room conversations (`message.created`, `message.updated`, `message.deleted`, `typing`)
- `dm:{conversationId}` — events for DM conversations (`message.created`, `message.updated`, `message.deleted`, `typing`)
- `user:{userId}` — per-user events (`unread.changed`, `presence.changed`, `friend.request`, `friend.accepted`, `friend.removed`, `block.created`, `block.removed`, `dm.frozen`)
- `presence` — broadcast `presence.changed` events to all authenticated clients

#### Scenario: Channel names are derived from conversation id, not room id
- **WHEN** the server publishes a room conversation event
- **THEN** the channel name uses the `Conversation.id`, not the `Room.id`

#### Scenario: Updated and deleted events use the same channel as created
- **WHEN** a message is edited or soft-deleted
- **THEN** the `message.updated` or `message.deleted` event is published on the same `room:{convId}` or `dm:{convId}` channel that carried the original `message.created`

## ADDED Requirements

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
