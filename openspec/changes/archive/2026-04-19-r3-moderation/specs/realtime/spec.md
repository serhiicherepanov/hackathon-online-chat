## MODIFIED Requirements

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

## ADDED Requirements

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
