## Why

The app currently renders inconsistent identity cues across the shell: friend avatars do not match the deterministic avatars used in conversation views, rooms in the sidebar have no comparable avatar treatment, and presence is shown as a separate dot instead of being anchored to the avatar itself. Tightening these rules now makes the sidebar easier to scan and prevents the same user or room from appearing with conflicting visual identities.

## What Changes

- Define a shared deterministic avatar treatment for conversation authors, friends, DM peers, and room rows, using the same stable identity inputs everywhere the app renders fallback avatars.
- Require the Rooms sidebar list to render an abstract room avatar so room rows are visually scannable alongside DM rows.
- Move live presence indication onto the avatar itself, with the status badge anchored at the avatar's bottom-right corner in sidebar rows and member/friend surfaces that already expose presence.
- Preserve existing online/afk/offline semantics and realtime update budgets while changing the required visual placement of the indicator.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `chat-ui`: require deterministic avatar rendering for sidebar room rows and consistent avatar treatment across sidebar and conversation surfaces.
- `social-graph`: require accepted-friend rows on the contacts page to use the same avatar treatment and avatar-anchored presence badge as other user surfaces.
- `presence`: require visible presence indicators to render as an avatar badge anchored at the bottom-right corner instead of a detached dot beside text labels.

## Impact

- Affected UI areas include the authenticated sidebar, contacts page, room members panel, and shared avatar/presence components.
- Likely touches shared avatar generation utilities and the styling contract for presence indicators.
- No new backend APIs are expected; existing presence snapshot/live events remain the source of truth.
