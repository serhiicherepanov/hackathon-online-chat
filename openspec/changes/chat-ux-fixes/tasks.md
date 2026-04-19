## 1. Sidebar unread badge polish

- [ ] 1.1 Update the sidebar conversation-row layout so the unread badge occupies reserved space and unread-count changes never alter row height or vertical alignment.
- [ ] 1.2 Refresh unread badge styling to use a stronger accent color for `unread > 0` while keeping the badge readable on the sidebar background.

## 2. Message row and composer interaction polish

- [ ] 2.1 Add `boring-avatars` and a small shared avatar wrapper for deterministic user avatars in chat surfaces.
- [ ] 2.2 Increase message-author username contrast and render avatars in message rows without breaking existing message layout.
- [ ] 2.3 Rework message-row actions into a compact icon-only toolbar that appears on hover and `focus-within`, keeping secondary actions behind the existing overflow menu.
- [ ] 2.4 Increase the visual contrast of the highlighted message row without regressing attachment, reply, or hover states.
- [ ] 2.5 Update the composer/editor chrome so it renders as a single lighter border in idle and focused states instead of stacking dark outer/focus borders.
- [ ] 2.6 Implement the empty-composer `ArrowUp` shortcut so it enters inline edit for the caller's most recent loaded editable message in the active conversation.
- [ ] 2.7 Ensure entering inline edit mode scrolls the edited message into the bottom working area near the composer.

## 3. Room member convenience actions

- [ ] 3.1 Add a maintained clipboard dependency and wire click-to-copy behavior with success feedback for rendered `userId` values in the room members panel.
- [ ] 3.2 Extend room member rows to show an "Add friend" action only for visible users where friendship/request state makes the action valid.
- [ ] 3.3 Reuse the existing friend-request mutation from the room members panel and update the row state in-place after a successful invite.

## 4. Verification

- [ ] 4.1 Add or update focused tests for unread badge stability/styling, author avatar rendering, stronger author-label contrast, hover-only message actions, the `ArrowUp` edit shortcut, and room-member copy/invite actions where nearby test coverage makes those regressions meaningful.
- [ ] 4.2 Run `pnpm typecheck` after implementation lands and fix any introduced type errors.
- [ ] 4.3 Run the relevant automated tests after implementation lands and capture the required logs under `test-artifacts/`.
- [ ] 4.4 Run `openspec validate chat-ux-fixes --strict` and confirm the change is apply-ready.
