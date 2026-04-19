## 1. Shared avatar foundation

- [x] 1.1 Add `boring-avatars` and create a shared avatar helper/component that centralizes the generated fallback variant, palette, and stable seed rules for users and rooms.
- [x] 1.2 Update existing user-avatar callers so message rows, DM rows, contacts rows, and member rows all use the shared fallback renderer while preserving uploaded avatar images.

## 2. Sidebar and surface updates

- [x] 2.1 Update the Rooms sidebar rows to render deterministic abstract room avatars generated from stable room identity data.
- [x] 2.2 Update DM sidebar rows, contacts friend rows, and room member rows to render presence as an avatar badge anchored at the bottom-right corner instead of a detached dot.
- [x] 2.3 Verify the same user without an uploaded avatar renders the same generated avatar across conversation, sidebar, contacts, and member surfaces.

## 3. Verification

- [x] 3.1 Add or update focused unit/component tests for the shared avatar renderer and avatar-anchored presence badge behavior.
- [x] 3.2 Add or update stack-backed e2e coverage for at least one signed-in flow that exercises the sidebar/member avatar and presence presentation.
- [x] 3.3 Run the relevant unit, typecheck, and targeted e2e verification and capture the results in the change work.
