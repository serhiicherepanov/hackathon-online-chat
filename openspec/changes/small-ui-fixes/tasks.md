## 1. Sidebar header interaction fixes

- [ ] 1.1 Update the sidebar accordion header layout so compact section action icons render before the disclosure chevron while preserving accessible labels and keyboard interaction.
- [ ] 1.2 Fix the Direct messages header control so the New DM contact-picker dialog opens even when the section is collapsed.
- [ ] 1.3 Fix the Rooms header controls so the create-room flow remains operable while the section is collapsed, without coupling it to accordion expansion.
- [ ] 1.4 Raise the shared toast viewport/layering so toast feedback remains visible above open dialogs and similar overlays.
- [ ] 1.5 Shorten the visible current-user ID label in constrained shell/details surfaces while keeping copy-to-clipboard bound to the full underlying ID.

## 2. Conversation bottom-pinning and local pill state

- [ ] 2.1 Adjust the virtualized conversation list logic so long histories that are already pinned to bottom stay flush with the newest message after live appends.
- [ ] 2.2 Scope "new messages" pill state to the active conversation and clear stale pill state when switching between rooms or DMs.
- [ ] 2.3 Verify the updated scroll/pill behavior does not regress existing read-marking or live message rendering flows.

## 3. Regression coverage

- [ ] 3.1 Add or update focused component/unit tests for sidebar header ordering, collapsed-section action activation, toast visibility above overlays, and shortened-visible/full-copy user-id behavior.
- [ ] 3.2 Add or update automated coverage for long-history bottom pinning and stale "new messages" pill reset behavior when navigating between conversations.
- [ ] 3.3 Run the relevant test suite(s) and capture the resulting logs in `test-artifacts/` before finalizing the implementation change.
