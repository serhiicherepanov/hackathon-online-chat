## Context

The recent avatar work successfully centralized deterministic fallback rendering, but it also collapsed the visual distinction between people and rooms by giving user avatars the same abstract look as room avatars. This regression is mostly a shared-UI-contract problem: the system still needs one centralized avatar path, but that path must deliberately branch by entity type so users keep the prior face-like identity treatment and rooms stay abstract.

## Goals / Non-Goals

**Goals:**

- Restore the previous face-like generated fallback style for users across all user-facing surfaces that rely on the shared avatar system.
- Preserve deterministic abstract generated avatars for rooms so room identity remains stable and visually distinct from users.
- Keep uploaded user avatar images as the highest-priority rendering path.
- Lock the behavior with focused tests around the shared avatar contract rather than relying on ad hoc visual checks.

**Non-Goals:**

- Changing presence semantics, badge placement, or realtime subscriptions.
- Adding uploaded room avatars or new persistence for avatar configuration.
- Reworking unrelated sidebar layout, typography, or theming decisions.

## Decisions

1. **Split the shared fallback renderer by entity type.** Keep one shared avatar entry point, but make it select a user-specific generated style for users and a room-specific generated style for rooms. This preserves centralized logic without forcing one visual treatment onto every identity type. Alternative considered: reverting to multiple hand-coded avatar call sites, which would reintroduce drift across surfaces.
2. **Treat "previous" user avatars as the normative style contract.** The restored user fallback should match the recognizable face-like style users had before the regression, while room avatars continue using the newer abstract treatment. Alternative considered: inventing a third style for users, but that would not actually resolve the regression the user reported.
3. **Keep deterministic seeding rules unchanged where possible.** The regression is about appearance, not identity stability, so user fallbacks should still be seeded from stable user identity data and room fallbacks from stable room identity data. Alternative considered: changing seeds while changing style, but that would create unnecessary visual churn for existing users and rooms.
4. **Verify at the shared-helper boundary and on at least one rendered surface.** Unit/component coverage should assert the selected variant/style for user vs room avatars, and a rendered-surface test should verify that a user row and a room row do not collapse to the same visual contract. Alternative considered: relying only on manual QA, which makes regressions easy to miss.

## Risks / Trade-offs

- **"Previous face-like style" may be interpreted loosely** -> Mitigation: define the user style in one shared helper/component contract and assert it in tests.
- **Some surfaces may still bypass the shared avatar entry point** -> Mitigation: scope the implementation to shared avatar callers first and update any stragglers as part of the same change.
- **Changing style without changing seed can still alter screenshots** -> Mitigation: keep the change intentionally limited to user-vs-room style selection and update affected tests explicitly.

## Migration Plan

- Ship as a normal frontend-only change with no schema, API, or data migration.
- Update the shared avatar implementation first, then re-run focused tests for the affected surfaces.
- If rollback is needed, revert the shared avatar style split without touching persisted user or room data.

## Open Questions

- None at spec time; the expected user-vs-room style split is clear from the regression report.
