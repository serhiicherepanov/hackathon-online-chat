## MODIFIED Requirements

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

## ADDED Requirements

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
