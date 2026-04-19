## Context

The current `/rooms` page renders only the public catalog via `useRoomCatalog`, even though the app already exposes `useMyRooms()` with enough membership data to identify the caller's joined private rooms. That makes private rooms discoverable from the sidebar only, not from the general room-browsing screen.

The conversation view uses `react-virtuoso` in `components/chat/message-list.tsx` and already tries to snap to bottom on first render and when new messages arrive while pinned. The reported bug suggests route/conversation switches can still leave the newest message outside the viewport, likely because the initial snap is racing with mount/measurement timing or because the "fresh conversation" path is not treated distinctly from ordinary rerenders.

The room members panel already has an initial fetch contract through `GET /api/rooms/:id/members`, and the realtime spec already reserves room-channel membership events such as `member.joined`. The reported bug suggests the room view is not consuming or reconciling that join event into the visible members list, so active viewers do not see new members until a reload or a manual refetch.

The sidebar shell already defines section order and action affordances, but the current header layout can place the disclosure arrow before the compact action buttons. The user also wants the Invites section to act as a single inbox for both pending private-room invites and incoming friend requests. Existing specs already provide the raw signals for both sources (`room.invited` and `friend.request`), so this is primarily a shell composition issue rather than a new product capability.

Room list rows currently use a generic avatar treatment that does not communicate visibility. The requested UX is simpler and more informative: show a public-room icon for public rooms and a lock icon for private rooms anywhere the UI renders room rows in these list contexts.

## Goals / Non-Goals

**Goals:**

- Surface the caller's joined private rooms on the `/rooms` screen without exposing unrelated private rooms in the public catalog.
- Preserve the existing public-catalog contract and join flow for public rooms.
- Ensure switching into a room or DM lands the user on the latest visible messages, while preserving the existing "do not yank the scroll when the user intentionally scrolled up" behavior for subsequent live messages.
- Ensure the room members panel updates live when another user joins the current room.
- Ensure sidebar headers render in a consistent order: title, action buttons, disclosure arrow.
- Ensure the sidebar Invites section shows both private-room invites and friend requests in one place.
- Ensure room rows use visibility-aware icons instead of generic avatars.
- Add focused regression coverage for all affected UI behaviors.

**Non-Goals:**

- Changing room membership, invites, or private-room authorization rules.
- Changing friendship semantics or introducing a new invite domain model.
- Replacing the message-list virtualization library or redesigning message pagination.
- Introducing a new membership-event family, unread semantics, or scroll-restoration across browser reloads.

## Decisions

- **Render private memberships as a separate authenticated section on `/rooms`, ahead of the public catalog**. The page should continue to show a public "browse/join" catalog, but add a separate "My private rooms" list sourced from `useMyRooms()` and filtered to `visibility === "private"`, placed before the public catalog content. This satisfies the user request with minimal risk and keeps the public catalog semantics intact.
  - Alternatives considered:
    - Expand `GET /api/rooms` to return joined private rooms. Rejected because it muddies a clean public-catalog contract and risks accidental private-room exposure.
    - Do nothing outside the sidebar. Rejected because it does not address the request that private rooms appear in general room lists.

- **Apply the same search term to both room sections**. A user searching from the `/rooms` screen should not need separate filters depending on visibility. Public matches stay joinable/openable in the catalog section; private matches only appear in the member-only section.
  - Alternative considered: keep search scoped to public rooms only. Rejected because it leaves private-room discovery awkward on the same page.

- **Treat conversation switches as a deliberate "initial anchor to latest" event**. On `conversationId` change, reset the message-list bottom-tracking state and schedule a flush-to-bottom pass after the new conversation data is rendered/measured. That path should be separate from the ordinary appended-message logic so route changes reliably show the newest messages without weakening the existing off-bottom/new-message pill behavior.
  - Alternatives considered:
    - Rely only on `initialTopMostItemIndex`. Rejected because it is not reliable enough once the virtualized list rerenders during route changes and async data hydration.
    - Force `followOutput="auto"` unconditionally. Rejected because it would pull users back to bottom even when they intentionally scrolled up.

- **Reconcile `member.joined` into the active room members panel**. The room view should subscribe to or consume the existing room-channel membership delta and update the visible member list for the open room without waiting for a fresh `GET /api/rooms/:id/members`. A targeted refetch after the event is acceptable if the current room view has already standardized on query invalidation rather than local patching, but the UI contract must remain live.
  - Alternatives considered:
    - Poll or rely on manual refresh. Rejected because the product already expects room views to stay live.
    - Add a new members-specific endpoint or event. Rejected because the existing room-channel contract should be sufficient.

- **Render sidebar headers with a fixed slot order**. Each accordion header should lay out its title first, optional compact actions second, and the disclosure chevron last, regardless of section-specific actions. This avoids per-section drift and makes the interaction model consistent.
  - Alternatives considered:
    - Fix only the currently wrong section. Rejected because the ordering bug is a shell-level pattern issue.
    - Allow actions after the chevron when there are many controls. Rejected because it weakens the requested consistent order.

- **Aggregate room invites and friend requests into the existing Invites section**. Reuse the current invite accordion and merge data from the room-invite source with the incoming friend-request source, with clear labels per row type so users can distinguish what they are accepting or navigating to.
  - Alternatives considered:
    - Add a fourth sidebar section just for friend requests. Rejected because the user explicitly wants them in Invites.
    - Keep friend requests only on the contacts page. Rejected because it does not solve the missing-sidebar-inbox problem.

- **Render room rows with fixed visibility icons**. Replace the generic room avatar in room-list contexts with a deterministic icon choice based on `visibility`: public-room icon for `public`, lock icon for `private`. Reuse the same mapping across sidebar and `/rooms` lists so visibility is recognizable at a glance.
  - Alternatives considered:
    - Keep avatars and add only text badges. Rejected because the request is to replace the avatar slot itself.
    - Use different per-room decorative icons unrelated to visibility. Rejected because visibility is the meaningful distinction users need here.

- **Extend existing unit/component coverage before adding heavier e2e work**. The repo already has a focused `message-list.test.tsx`, and the `/rooms` page logic is a good candidate for a client-component test that mocks the room hooks. The members-panel join handling and the sidebar header/invite aggregation should likewise prefer focused component or shell tests before adding broader e2e coverage, and room-row icon mapping should be covered in the same lightweight UI layer.

## Risks / Trade-offs

- **Two room data sources on one page can drift** -> Keep the private section derived strictly from `useMyRooms()` and the public section from `useRoomCatalog()`, with shared invalidation after joins/creates so both stay fresh.
- **Search UX may be ambiguous when one section is empty** -> Render clear section labels and empty-state copy so users understand whether no public rooms matched, no private memberships matched, or both.
- **Virtuoso timing may still be sensitive to dynamic row heights** -> Use the existing multi-pass snap helper and verify it runs on conversation switches after the new items are present; keep the new-message pill logic unchanged for non-pinned updates.
- **Membership deltas can duplicate or race with initial fetches** -> Reconcile incoming joined members by stable user id / membership id so the members panel does not show duplicate rows when a live event lands near the initial query response.
- **Merged invites can blur different actions** -> Label room invites vs friend requests explicitly and keep their row actions distinct so users do not confuse "accept room invite" with "accept friend request".
- **Header layout fixes can regress keyboard/accordion affordances** -> Keep the chevron/disclosure bound to the same accessible accordion trigger while only changing visual slot order.
- **Visibility icons can drift across screens** -> Centralize the public/private icon mapping so sidebar and room-browsing lists do not disagree.
- **Test mocks can miss browser-specific scroll quirks** -> Keep unit tests focused on the imperative scroll calls/state transitions, then run the existing app-level verification once implementation is done.

## Migration Plan

Ship as a normal UI bugfix release with no schema or data migration. Rollback is reverting the change if the new room section or conversation-anchor logic regresses navigation or scroll behavior.

## Open Questions

- The private section should appear above the public catalog to prioritize the caller's own rooms.
- Whether the `/rooms` page should include private room descriptions when present, or keep the section more compact than the public catalog cards.
- Whether the current room view already has access to a normalized room-channel event payload for joined members, or whether it is simpler/safer to invalidate the members query on `member.joined`.
- Whether the merged Invites section should sort room invites and friend requests together by recency or keep them visually grouped by type inside the same accordion.
