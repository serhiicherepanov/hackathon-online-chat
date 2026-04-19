## Why

Room moderators currently have a single "remove user" action in room settings, which makes the moderation outcome ambiguous. Reviewers need an explicit choice between removing a member (can rejoin later) and banning a user (cannot rejoin until unbanned).

## What Changes

- Split the room-settings member moderation action into two explicit actions: `Remove` and `Ban`.
- Align action labels, confirmation copy, and outcomes with backend room moderation rules so moderators understand the effect before confirming.
- Ensure the members-management flow updates room membership and ban views consistently after each action.
- Add automated coverage for the two moderation paths to prevent regressions in the room settings workflow.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `room-moderation`: Clarify and enforce distinct moderation outcomes for remove versus ban actions from room management flows.
- `chat-ui`: Update Manage Room member actions to expose both remove and ban affordances with clear user-facing feedback.

## Impact

- Affected specs: `openspec/specs/room-moderation/spec.md`, `openspec/specs/chat-ui/spec.md`.
- Affected code areas: room management dialog actions, member list action handlers, moderation API wiring, and end-to-end moderation scenarios.
- Test impact: unit and/or e2e coverage for explicit remove vs ban behavior in room settings.
