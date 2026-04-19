## 1. API moderation behavior alignment

- [ ] 1.1 Update `DELETE /api/rooms/:id/members/:userId` to remove membership without creating/updating a `RoomBan` row, while keeping owner-protection and role checks.
- [ ] 1.2 Keep `POST /api/rooms/:id/bans/:userId` as the explicit ban path and ensure remove vs ban emits correct `room.access.revoked` reasons.
- [ ] 1.3 Add or update backend tests for remove and ban outcomes (membership row changes, `RoomBan` changes, and forbidden owner actions).

## 2. Manage Room UX updates

- [ ] 2.1 Replace the single member moderation control with separate `Remove` and `Ban` actions in the Manage Room members surface.
- [ ] 2.2 Add distinct confirmation copy for each action, including whether rejoin is allowed without unban.
- [ ] 2.3 Ensure the members and banned lists refresh correctly after each action, and keep current-room revocation handling intact.

## 3. Regression verification

- [ ] 3.1 Update room moderation e2e coverage to assert the explicit remove path does not create a ban and the ban path does.
- [ ] 3.2 Run targeted and/or full stack-backed e2e verification and capture logs in `test-artifacts/`.
- [ ] 3.3 Run `pnpm typecheck` and relevant unit tests for touched moderation/UI modules before finalizing.
