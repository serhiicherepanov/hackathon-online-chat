## MODIFIED Requirements

### Requirement: Channel naming

The system SHALL use the following channel names, and no others, for R3 fan-out.

- `room:{conversationId}` — events for room conversations (`message.created`, `message.updated`, `message.deleted`, `message.reactions.updated`, `typing`, `member.joined`, `member.left`, `member.banned`, `role.changed`, `room.updated`, `room.deleted`)
- `dm:{conversationId}` — events for DM conversations (`message.created`, `message.updated`, `message.deleted`, `message.reactions.updated`, `typing`)
- `user:{userId}` — per-user events (`unread.changed`, `presence.changed`, `friend.request`, `friend.accepted`, `friend.removed`, `block.created`, `block.removed`, `dm.frozen`, `room.invited`, `room.access.revoked`, `room.deleted`)
- `presence` — broadcast `presence.changed` events to all authenticated clients

#### Scenario: Channel names are derived from conversation id, not room id

- **WHEN** the server publishes a room conversation event
- **THEN** the channel name uses the `Conversation.id`, not the `Room.id`

#### Scenario: Updated and deleted events use the same channel as created

- **WHEN** a message is edited or soft-deleted
- **THEN** the `message.updated` or `message.deleted` event is published on the same `room:{convId}` or `dm:{convId}` channel that carried the original `message.created`

## ADDED Requirements

### Requirement: `message.reactions.updated` event contract

The system SHALL publish `message.reactions.updated` on the message’s conversation channel (`room:` or `dm:`) only after the reaction toggle transaction commits. The payload SHALL include `conversationId`, `messageId`, and `reactions` using the same shape as REST message serialization. If the Centrifugo publish fails, the HTTP toggle SHALL still succeed and the failure SHALL be logged.

#### Scenario: Toggle publishes reactions event

- **WHEN** `POST /api/messages/:messageId/reactions` succeeds
- **THEN** the server publishes `message.reactions.updated` on `room:{convId}` or `dm:{convId}` with the updated `reactions` array for that message
- **AND** the publish occurs after Postgres commit
