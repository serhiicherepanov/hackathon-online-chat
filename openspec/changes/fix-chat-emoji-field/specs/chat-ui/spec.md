## ADDED Requirements

### Requirement: Composer emoji insertion has automated regression coverage

The implementation SHALL include automated tests that verify the composer integrates emoji selection with the message text field so that inserting an emoji updates the draft text in a predictable way (at the caret when the textarea is focused and has a known selection, or by the documented fallback when no textarea state is available). Tests MAY mock `emoji-picker-element` and SHALL remain runnable in the standard Vitest jsdom environment used by the repo.

#### Scenario: Inserting an emoji updates composer text

- **WHEN** the emoji pick callback is invoked with a Unicode glyph while the composer textarea is in a known state
- **THEN** the composer draft string reflects the insertion at the appropriate position
- **AND** the test suite passes under `pnpm test` without manual browser interaction

#### Scenario: Regression harness does not require production-only APIs

- **WHEN** a contributor runs unit tests for the composer emoji flow
- **THEN** no live WebSocket, database, or Next.js route handlers are required for that coverage
