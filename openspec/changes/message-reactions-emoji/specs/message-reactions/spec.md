## ADDED Requirements

### Requirement: Conversation members may toggle emoji reactions on messages

The system SHALL allow authenticated members of a conversation to add or remove their own emoji reaction on a non-deleted message in that conversation using a single toggle endpoint. The server SHALL reject reactions when the caller is not a member, when the message is soft-deleted, and when the DM conversation is frozen for sends (same gate as `POST /api/conversations/:id/messages`). The server SHALL validate `emoji` as a non-empty Unicode emoji sequence within documented byte and grapheme limits and SHALL reject arbitrary non-emoji text.

#### Scenario: Member toggles on a reaction

- **WHEN** a conversation member calls `POST /api/messages/:messageId/reactions` with `{ "emoji": "👍" }` and no row exists for `(messageId, caller, emoji)`
- **THEN** the server inserts a `MessageReaction` row
- **AND** responds `200 OK` with a body indicating the reaction was added
- **AND** after commit, publishes `message.reactions.updated` on `room:{convId}` or `dm:{convId}` with the full updated reactions summary for that message

#### Scenario: Member toggles off an existing reaction

- **WHEN** the same caller repeats the request for an emoji they already reacted with
- **THEN** the server deletes that row
- **AND** responds `200 OK` indicating removal
- **AND** publishes `message.reactions.updated` with the updated summary (possibly empty)

#### Scenario: Non-member is forbidden

- **WHEN** a user who cannot read the conversation calls the toggle endpoint
- **THEN** the server responds `403 Forbidden` or `404 Not Found` consistent with message read rules
- **AND** no row is written

#### Scenario: Frozen DM is rejected

- **WHEN** a DM participant calls the toggle endpoint while the DM is frozen for sends
- **THEN** the server responds `403 Forbidden` with an error compatible with the DM frozen contract
- **AND** no row is written

#### Scenario: Deleted message is rejected

- **WHEN** the target message has `deletedAt IS NOT NULL`
- **THEN** the server responds with `410 Gone` or `400 Bad Request`
- **AND** no row is written

#### Scenario: Invalid emoji payload is rejected

- **WHEN** the body contains whitespace-only text, plain ASCII words, or exceeds the allowed emoji size
- **THEN** the server responds `400 Bad Request`
- **AND** no row is written

### Requirement: Reaction summaries are deterministic

The system SHALL aggregate reactions per message into a stable JSON shape for REST and realtime: each distinct `emoji` appears once with a `count` and a list of reacting user ids (or a capped list plus `count` if truncation is used), with deterministic ordering (e.g. emoji sorted lexically, user ids sorted lexically within each emoji).

#### Scenario: Multiple users react with the same emoji

- **WHEN** three distinct members each toggle 👍 on the same message
- **THEN** the serialized summary for 👍 has `count = 3` and includes each of their user ids subject to any documented cap

#### Scenario: One user multiple emojis

- **WHEN** a member adds 👍 and separately adds ❤️ on the same message
- **THEN** two summary entries exist with independent counts
