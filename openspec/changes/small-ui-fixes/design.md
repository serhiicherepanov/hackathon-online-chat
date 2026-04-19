## Context

These fixes stay within the existing R0/R1 chat shell and message-view architecture: the sidebar already owns compact entry points for DMs and room actions, conversation history already uses `react-virtuoso` with local "at bottom" and "new messages" UI state, and user feedback relies on the shared toast surface. The failures are coordination bugs rather than missing product surface area: the accordion trigger currently competes with action buttons in the section header, collapsed sections can effectively hide or disable action entry points, the conversation view is not consistently recalculating bottom pinning and unread-pill state when long histories or route changes are involved, overlay layers can visually cover toasts that are supposed to confirm the user's action, and full raw user IDs can overflow narrow details/sidebar layouts even though copy actions still need the complete value.

## Goals / Non-Goals

**Goals:**
- Keep sidebar header actions visible and operable regardless of accordion expansion state.
- Make the header affordance order unambiguous by rendering action icons before the disclosure chevron.
- Keep transient toast feedback visible even while dialogs or other overlays are open.
- Keep visible user-id labels compact in constrained layouts without losing access to the full ID for copy actions.
- Preserve a true bottom-pinned experience for long virtualized threads so new messages land flush with the viewport end.
- Scope "new messages" pill state to the active conversation and clear stale state on room/DM switches.
- Add targeted regression coverage for these interaction paths.

**Non-Goals:**
- Redesigning the sidebar information architecture, room/DM APIs, or realtime event contracts.
- Replacing `react-virtuoso` or reworking pagination strategy for message history.
- Changing unread badge semantics in the sidebar beyond the local conversation-view pill/reset behavior.
- Redesigning the app's toast content/copy beyond fixing the layer ordering bug.
- Changing the underlying user-id value, copy payload, or identity model.

## Decisions

- **Separate sidebar action controls from accordion disclosure behavior.**
  - Section header actions should remain interactive even while the section body is collapsed.
  - The disclosure chevron should be the final control in the header cluster, visually distinct from the action icons it does not own.
  - Alternative considered: expanding the section automatically before opening the modal/action.
  - Reason for rejection: it couples two independent intents, adds avoidable state churn, and still leaves the header ordering ambiguous.

- **Treat bottom pinning as derived conversation-local view state, not a one-time mount effect.**
  - The message list should re-evaluate whether it is pinned after live inserts, history growth, and route changes, then explicitly scroll to the real bottom when the user was pinned.
  - Alternative considered: relying on a generic "scroll to end on append" effect.
  - Reason for rejection: it tends to leave a residual gap in virtualized lists and can incorrectly fire after switching into another conversation.

- **Place the shared toast viewport above modal/dialog overlays instead of inside a lower shell layer.**
  - Success/error feedback triggered from invite dialogs, room creation, and similar popup flows should remain readable without dismissing the overlay first.
  - Alternative considered: duplicating inline feedback inside each popup and leaving toast layering as-is.
  - Reason for rejection: it fragments feedback patterns and still leaves other toast-triggering overlay flows broken.

- **Render compact user-id previews while copying the full underlying identifier.**
  - Constrained surfaces such as a right-sidebar/current-user details block should show only the leading 8 characters of the ID, or an equivalent visually clipped width, while copy-to-clipboard actions continue to use the full stored ID.
  - Alternative considered: copying the visibly truncated string so the label and clipboard value always match.
  - Reason for rejection: it makes the copy action much less useful for debugging, support, and moderation flows that require the full identifier.

- **Key "new messages" pill state by conversation id and reset it when the active conversation changes.**
  - Route changes should start with a clean local pill state for the newly opened room/DM.
  - Alternative considered: keeping one shared pill flag for the whole shell.
  - Reason for rejection: shared state leaks stale indicators between conversations and makes the UI look like unread arrived in the wrong room.

- **Cover the behavior with focused UI and long-history tests instead of broad snapshot checks.**
  - Component tests can assert header ordering and that collapsed-section actions still open their dialogs.
  - Targeted unit/e2e coverage can validate bottom pinning and per-conversation pill reset behavior in realistic long-thread flows.

## Risks / Trade-offs

- **Virtualized scrolling can remain timing-sensitive with dynamic row heights** -> Mitigate by basing bottom-follow logic on the list's current bottom state and verifying behavior with long-history coverage, not just short threads.
- **Raising toast z-index can conflict with other floating surfaces** -> Mitigate by using one shared top-level toast viewport layer that intentionally sits above modal overlays, then verifying dialogs/popovers still remain interactive.
- **Truncated labels can confuse users if the copy action is not explicit** -> Mitigate by pairing the shortened visible label with a clear copy affordance and tests/assertions that the clipboard payload still uses the full ID.
- **Sidebar header refactors can accidentally shrink click targets or break keyboard access** -> Mitigate by keeping action buttons as independent controls with their own accessible labels and by testing collapsed-state activation.
- **Resetting the local pill state too aggressively could hide legitimate unread context** -> Mitigate by scoping the reset to route/conversation changes only, while leaving actual unread badge state in the existing per-conversation caches/stores.
