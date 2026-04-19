## Context

The current app already has the major product flows in place, but several common chat interactions still create friction: unread badges resize list rows as counts change, message-level affordances compete with the content, the composer border feels too heavy, and inline edit mode can leave the active message partially off-screen. There is also one missing shortcut path in the room members panel: sending a friend request to a visible user without leaving the room.

This change is intentionally a UX consolidation pass rather than a feature release. Most work stays inside the existing Next.js client surface (`components/app/*`, hooks, and shared UI primitives), but it crosses multiple app areas at once:

- sidebar conversation rows and unread badges,
- message list item chrome and highlight treatment,
- composer keyboard/edit orchestration,
- room members list actions,
- social-graph mutation entry points,
- dependency management for clipboard behavior.

## Goals / Non-Goals

**Goals:**
- Keep sidebar row height visually stable regardless of unread count width.
- Make unread and highlighted states noticeably easier to scan.
- Reduce per-message visual noise by moving actions to a hover-only icon row with overflow preserved behind the existing menu.
- Make message editing feel anchored by scrolling the editable row into a predictable viewport position and exposing `ArrowUp` as the first composer hotkey for "edit my last message".
- Let users copy surfaced ids with one click and immediate feedback.
- Let users send a friend invite from the room members list without inventing a second friendship workflow.

**Non-Goals:**
- No new backend friendship model or alternate invite transport; this reuses the existing friend-request endpoint.
- No broad keyboard shortcut system beyond the single `ArrowUp` edit shortcut in the active composer.
- No redesign of room membership or moderation roles.
- No message API contract change; this is primarily client behavior and presentation.

## Decisions

### D1. Treat the unread badge as reserved space, not intrinsic content width

Sidebar rows should reserve a fixed badge slot so the row layout does not reflow when the unread count changes from empty to 1 digit or 2+ digits. The badge itself can vary internally, but the list item must keep the same height and right-edge alignment in all states.

Alternative considered: only tweak padding/font-size on the current badge. Rejected because the shift is caused by layout participation, not just styling; a reserved slot is more robust.

### D2. Keep visual polish inside the existing shadcn/Tailwind system

Unread badges, highlighted rows, and composer borders should be adjusted by tokens/classes already used in the app instead of adding one-off inline styles. This keeps the fix small, consistent with the rest of the chat shell, and easier to tune later.

Alternative considered: custom CSS overrides outside the component tree. Rejected because the affected states are component-local and easier to reason about in-place.

### D3. Use a maintained clipboard helper with graceful browser fallback

Click-to-copy for user ids should use a maintained library that wraps the Clipboard API and degrades cleanly when browser permissions vary, instead of open-coding `navigator.clipboard.writeText` in multiple components. The copy trigger should stay explicit and paired with local toast/inline confirmation feedback.

Alternative considered: bespoke helper around `navigator.clipboard`. Rejected because the project already has several user-facing interaction surfaces and the library cost is justified by reliability and reduced edge-case handling.

### D4. Model message actions as a compact hover toolbar plus overflow menu

Primary actions should render as icon-only buttons on a single row that appears on message hover/focus-within. Lower-frequency actions remain under the existing dots menu so the row stays compact. Keyboard focus must still reveal the toolbar so the actions remain accessible without a mouse.

Alternative considered: always-visible icons with smaller labels. Rejected because it still adds noise to every row and does not solve density.

### D5. Drive `ArrowUp` editing from the loaded message list state

When the composer is empty and the caret is at the start, pressing `ArrowUp` should locate the most recent editable message authored by the caller in the active, already-loaded conversation state and enter inline edit mode for that message. If no editable message is loaded, the key should do nothing.

This keeps the shortcut deterministic, avoids any new "latest editable message" endpoint, and fits the current virtualized list model. Entering edit mode should also request the list to scroll that row into view near the bottom so the edit field and composer remain in the same working area.

Alternative considered: ask the server for the latest editable message on demand. Rejected because it adds latency, extra API surface, and disagreement risk with the currently loaded list.

### D6. Reuse the existing friend-request mutation from room member rows

The room members list should expose an "Add friend" contextual action only when the visible user is not already a friend, not pending, and not the caller. The action should call the same friend-request mutation used on the contacts page and reflect the resulting pending state in-place.

Alternative considered: new dedicated room-member invite endpoint. Rejected because the underlying domain action is still a standard friend request, not a room-specific relationship.

## Risks / Trade-offs

- Hover-only message actions can reduce discoverability -> Mitigation: reveal on hover and `focus-within`, keep the dots menu recognizable, and use standard action icons.
- `ArrowUp` edit can conflict with multiline caret expectations -> Mitigation: only trigger when the composer is empty (or otherwise at the shortcut-safe empty state), leaving normal textarea navigation untouched once content exists.
- Adding a clipboard dependency slightly increases bundle size -> Mitigation: choose a small, focused library and use it only on the affected interactive elements.
- Room-member friend actions may need extra relationship hints from existing queries -> Mitigation: prefer enriching current room-members/social queries over creating a separate fetch path.

## Migration Plan

1. Add the clipboard dependency and wire a shared copy interaction helper if needed.
2. Update sidebar row and badge rendering so unread changes no longer affect item height.
3. Refine message row presentation: stronger highlight state, hover/focus action toolbar, overflow menu retention.
4. Update composer/edit orchestration for lighter borders, bottom-aligned edit entry, and `ArrowUp` last-message editing.
5. Extend room member rows with relationship-aware friend invite actions backed by the existing social mutation.
6. Add targeted unit/e2e coverage for the new UX contracts.

Rollback strategy:
- Revert the client-side change set and remove the clipboard dependency if necessary. No schema or migration rollback is required.

## Open Questions

- Whether user-id copy affordance should appear in all places that render an id, or only in the room members surface for the first pass.
- Whether room member rows already have enough relationship state to decide when "Add friend" should be shown, or if the room-members payload should be enriched in the same change.
