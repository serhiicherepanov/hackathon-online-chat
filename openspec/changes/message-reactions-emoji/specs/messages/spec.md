## ADDED Requirements

### Requirement: Message payloads include reaction summaries

The system SHALL include a `reactions` array on every serialized `Message` object returned from `GET /api/conversations/:id/messages`, from single-message fetches if applicable, and in all realtime `message.*` payloads that carry a full message object. For soft-deleted messages, `reactions` SHALL be an empty array or omitted consistent with other omitted fields on deleted payloads.

#### Scenario: History page includes reactions

- **WHEN** a member fetches a page of messages and some rows have reactions
- **THEN** each `messages[]` entry includes `reactions` matching the aggregation contract from the `message-reactions` capability

#### Scenario: New message starts with empty reactions

- **WHEN** a `message.created` event is published for a newly inserted message
- **THEN** the payload includes `reactions: []` (or equivalent empty shape)

### Requirement: Reaction toggle is authorized like message read

The system SHALL use the same conversation membership (and DM participation) checks for `POST /api/messages/:messageId/reactions` as for reading the parent message’s conversation.

#### Scenario: Room member can react

- **WHEN** the caller is a `RoomMember` for the room backing the message’s conversation
- **THEN** the toggle endpoint proceeds to validation and persistence

#### Scenario: Stranger cannot react in a room

- **WHEN** the caller is not a member of the conversation
- **THEN** the server does not mutate reactions
