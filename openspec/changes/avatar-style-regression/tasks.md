## 1. Shared avatar contract

- [x] 1.1 Update the shared avatar helper/component so generated fallback rendering explicitly branches by entity type: users use the restored face-like style, rooms use the abstract style.
- [x] 1.2 Keep uploaded user avatar images and existing deterministic seed inputs intact while applying the new user-vs-room style split.

## 2. Surface alignment

- [x] 2.1 Update chat UI user surfaces that rely on the shared avatar contract, including message authors and DM rows, to use the restored user-avatar style.
- [x] 2.2 Update room identity surfaces that rely on the shared avatar contract so room rows continue using deterministic abstract avatars.
- [x] 2.3 Update contacts friend rows to use the same restored user-avatar style as the rest of the user-facing surfaces.

## 3. Verification

- [x] 3.1 Add or update focused unit/component tests that assert users render the face-like fallback style and rooms render the abstract fallback style through the shared avatar entry point.
- [x] 3.2 Add or update at least one rendered-surface test that covers a user-facing row and a room-facing row so the distinction cannot silently regress.
- [x] 3.3 Run the relevant unit/typecheck verification for the avatar style regression work and capture the results in the change work.
