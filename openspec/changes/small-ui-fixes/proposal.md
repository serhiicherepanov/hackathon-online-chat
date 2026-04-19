## Why

Several everyday chat interactions still feel broken or inconsistent: sidebar section action icons are ordered awkwardly, collapsed sections can hide the controls that open the New DM and create-room flows, long message threads do not reliably stay pinned to the bottom, toast notifications can render underneath active overlays, and visible user IDs can overrun narrow identity surfaces. Those issues make core navigation and messaging feel unstable even though the underlying capabilities already exist.

## What Changes

- Reorder sidebar section header controls so compact action icons render before the accordion chevron, keeping the controls visible and reachable.
- Require the New DM and create-room entry points to remain operable even when their sidebar sections are collapsed.
- Tighten the virtualized conversation scroll behavior so bottom-pinned threads stay fully scrolled to the newest message without leaving a visible gap.
- Reset per-conversation "new messages" pill state correctly when switching between rooms or DMs so stale indicators do not appear after navigation.
- Require toast notifications to render above modal/dialog overlays so feedback remains visible while popups are open.
- Truncate visible user-id rendering in constrained shell/details surfaces to a short preview while keeping copy actions bound to the full underlying ID.
- Add focused regression coverage for sidebar header actions, toast layering, user-id truncation/copy behavior, and long-history conversation scrolling behavior.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `chat-ui`: The authenticated shell and conversation-view requirements need clearer sidebar header action behavior, visible-above-overlay toast feedback, truncated-visible/full-copy user-id handling, and more robust bottom-pinned/new-message handling in virtualized message lists.

## Impact

- **Code**: Sidebar accordion header components, New DM/create-room triggers, toast/toaster layering relative to Radix overlays, current-user identity rendering/copy affordances, conversation message-list scroll state, and unread/new-message pill coordination across route changes.
- **Tests**: Targeted component tests for sidebar header actions, toast visibility over overlays, and visible-vs-copied user-id behavior plus unit/e2e coverage for message-list bottom pinning and per-conversation new-message state reset.
- **APIs / realtime**: No new endpoints; existing live message events continue to drive the conversation list behavior.
- **Docs**: OpenSpec artifacts only.
