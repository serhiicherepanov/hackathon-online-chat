## Why

Several core chat interactions still feel rough in daily use: unread badges shift the sidebar layout, highlighted rows and badges are too subtle, message author identity is hard to scan, message actions are noisy, inline edit can leave the active message off-screen, and common actions such as copying a user id or sending a friend invite from the room members list take too many steps. These are polish fixes, but they directly affect the speed and clarity of the classic chat workflow and should land together as one UX stabilization pass.

## What Changes

- Stabilize unread badges so count changes never alter sidebar row height, and update badge styling to use a clear accent state instead of a muted gray.
- Increase visual contrast for the highlighted message row and lighten the composer border treatment so the editor keeps a single subtle outline in idle and focus states.
- Increase message-author contrast in the chat UI and add deterministic user avatars in message rows using the `boring-avatars` React package.
- Make user ids copyable from the UI with explicit click affordance and feedback, using a maintained clipboard helper instead of ad-hoc browser calls.
- Refine inline message editing so entering edit mode scrolls the active message into view at the bottom and supports the first keyboard shortcut: `ArrowUp` in an empty composer edits the caller's latest editable message in the active conversation.
- Replace always-visible text message actions with a hover-revealed single-row icon action bar, keeping overflow actions behind the existing dots menu.
- Allow sending a friend invite directly from the room members list when the target is not already a friend.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `chat-ui`: tighten conversation-row, message-author, avatar, composer, message-highlight, message-action, and inline-edit interaction requirements for a denser, more stable chat surface.
- `unread-badges`: change sidebar badge presentation so unread count updates preserve list-row layout and use stronger unread styling.
- `rooms`: extend the members-panel UI contract so member rows can expose contextual actions such as inviting a visible user as a friend.

## Impact

- UI work spans the sidebar conversation rows, message row renderer, composer/editor styles, and room members panel.
- API behavior should mostly reuse existing friendship endpoints; only the room-members action surface and any returned relationship hints may need small contract updates.
- Likely dependency impact includes adding a maintained clipboard utility for click-to-copy behavior and `boring-avatars` for deterministic message avatars.
- Tests should cover unread badge stability, keyboard edit hotkey behavior, hover-only message actions, and sending a friend request from a room member row.
