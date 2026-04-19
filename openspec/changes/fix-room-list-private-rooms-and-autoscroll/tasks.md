## 1. Fix sidebar shell behavior

- [ ] 1.1 Update the sidebar accordion header layout so each section renders title first, compact action buttons second, and disclosure arrow last without breaking expand/collapse behavior.
- [ ] 1.2 Extend the Invites section to aggregate pending room invites and incoming friend requests in one accordion with clear row labeling.
- [ ] 1.3 Replace generic room avatars in sidebar and room-list contexts with a public-room icon for `public` rooms and a lock icon for `private` rooms, using one shared mapping.
- [ ] 1.4 Add or update focused shell/sidebar tests covering header slot order, merged invite rendering, and room visibility icons.

## 2. Surface private-room memberships on `/rooms`

- [ ] 2.1 Update `app/(app)/rooms/page.tsx` to load the caller's room memberships alongside the public catalog and render joined private rooms in a clearly separate section.
- [ ] 2.2 Place the private-room section before the public catalog and apply the existing `/rooms` search term to both sections while keeping join/create invalidation refreshing both datasets.
- [ ] 2.3 Add or update focused UI tests for the `/rooms` page so private memberships appear only for the current user and remain separate from the joinable public catalog.

## 3. Restore bottom anchoring when entering a conversation

- [ ] 3.1 Update `components/chat/message-list.tsx` so changing `conversationId` reliably resets stale off-bottom state and snaps the newly opened conversation to its latest message.
- [ ] 3.2 Preserve the existing "new messages" pill behavior for already-open conversations where the user intentionally scrolled away from the bottom.
- [ ] 3.3 Extend `components/chat/message-list.test.tsx` (or adjacent tests) to cover conversation-switch anchoring in addition to the existing pinned/off-bottom behaviors.

## 4. Keep the room members panel live

- [ ] 4.1 Update the open room view so `member.joined` (or the existing equivalent room-channel membership delta) refreshes the visible members panel without a manual reload.
- [ ] 4.2 Reconcile live join updates safely with the initial members query so a newly joined user does not render twice.
- [ ] 4.3 Add or update focused tests for the members panel so a join event adds the new member while preserving presence rendering.

## 5. Verify the end-to-end behavior

- [ ] 5.1 Add or update stack-backed e2e coverage for the sidebar shell, `/rooms` browsing flow, conversation-switch flow, and/or members-panel join flow if unit tests alone do not cover the user-visible regressions confidently.
- [ ] 5.2 Run the relevant verification commands (`pnpm typecheck`, targeted/unit tests, and the required stack-backed e2e command for any added/updated e2e coverage) and fix regressions before closing the change.
