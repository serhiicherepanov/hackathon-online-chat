## ADDED Requirements

### Requirement: Typing indicators for rooms and direct messages
The system SHALL show typing indicators for room and DM conversations by publishing ephemeral realtime events while a participant is actively composing text. Typing state SHALL be throttled client-side and SHALL expire automatically after 3 seconds without a refresh event.

#### Scenario: Room participant sees peer typing
- **WHEN** user B begins typing in a room conversation and their composer contains non-empty text
- **THEN** the client publishes a `typing` event on `room:{conversationId}` within 1 second
- **AND** user A, who is subscribed to the same room, sees a typing indicator naming B

#### Scenario: DM participant sees peer typing
- **WHEN** user B begins typing in a DM conversation and the DM is not frozen
- **THEN** the client publishes a `typing` event on `dm:{conversationId}`
- **AND** the other DM participant sees the typing indicator within 1 second

#### Scenario: Typing indicator expires after inactivity
- **WHEN** no fresh `typing` event is received for a participant for 3 seconds
- **THEN** that participant is removed from the local typing indicator state
- **AND** the typing UI disappears without requiring an explicit stop event

#### Scenario: Empty composer does not emit typing
- **WHEN** the composer is empty or contains only whitespace
- **THEN** the client does not publish a `typing` event

#### Scenario: Frozen direct message does not emit typing
- **WHEN** a DM conversation is frozen because either participant has an active block
- **THEN** the composer is read-only
- **AND** no typing events are published for that DM
