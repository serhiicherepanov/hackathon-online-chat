## Context

R4 is the "finish and prove it" release. The current app already covers the core chat flows through R2, but it still lacks account lifecycle features reviewers expect from a real product, and it does not yet package its non-functional proof points into reproducible, reviewable artifacts. The release plan also calls out scale-specific work that must be designed deliberately rather than left as cleanup at the end.

This change touches multiple layers at once:

- Prisma schema and auth/account APIs for password reset tokens, profile fields, and session management.
- Signed-in UI for settings, active sessions, delete-account confirmation, and polished empty/loading states.
- Message history query/index tuning and virtualized rendering assumptions for 10k-message rooms.
- Operational scripts/docs for healthchecks, seed/demo data, README completeness, and repeatable load/performance runs.

The design must preserve existing invariants from earlier releases: persistent per-browser sessions, DM/room access control, PostgreSQL as the source of truth, Centrifugo for live fan-out only, and a reviewer-friendly `docker compose up` flow from the repo root.

## Goals / Non-Goals

**Goals:**

- Add secure account lifecycle flows: password reset, password change, profile updates, active session listing/revocation, and account deletion.
- Define deterministic account-deletion behavior that preserves messages outside owned rooms via tombstoning while still deleting data that must disappear.
- Make the stack submission-ready with healthchecks, documented seed/bootstrap flow, and README/demo artifacts a reviewer can follow without tribal knowledge.
- Capture explicit performance and scale work for 10k-message history and ~300 concurrent realtime clients, with scripts/reports that can be rerun locally.

**Non-Goals:**

- Building production email delivery infrastructure; R4 only needs a pluggable transport plus a dev-visible delivery path.
- Replacing the existing auth/session model with OAuth, magic links, or stateless JWT browser auth.
- Re-architecting realtime transport away from Centrifugo.
- Solving R5-scale horizontal architecture; R4 verifies the single-node submission target.

## Decisions

### 1. Account lifecycle becomes a dedicated capability rather than an extension of sign-in only

Rationale: password reset, session management, profile editing, and destructive account deletion are related from the user's perspective, but they span more than the existing "sign in / sign out" auth contract. A dedicated `account-management` capability keeps the spec/tasks coherent while allowing the existing `auth` capability to stay focused on login/session creation semantics.

Alternatives considered:

- Extend `auth` directly with every new requirement: rejected because it would mix account settings, recovery, and destructive lifecycle flows into a spec that currently describes only authentication basics.
- Split into several tiny capabilities (`password-reset`, `profile`, `sessions`): rejected because the implementation will likely share routes, UI surface, and data models.

### 2. Password reset uses hashed single-use DB tokens and a pluggable dev-first transport

Rationale: a `PasswordResetToken` table with `tokenHash`, `expiresAt`, and `usedAt` matches the repo's server-owned security model, avoids storing raw reset secrets, and remains compatible with both a simple dev logger and a future SMTP transport. The reset request endpoint can always return success-style responses to avoid account enumeration.

Alternatives considered:

- Store raw tokens in the database: rejected for avoidable security exposure.
- Reuse session cookies for recovery: rejected because recovery must work when the user is logged out.
- Integrate real email delivery now: rejected as unnecessary for the hackathon submission scope.

### 3. Active session management reuses the existing `Session` table with richer metadata

Rationale: the repo already models per-browser sessions in the database. Listing and revoking sessions should build directly on that table by ensuring browser/IP/last-seen metadata is present and exposed through a dedicated settings API. Revocation remains a row delete/invalidation, which naturally preserves the existing "sign out only this browser" behavior.

Alternatives considered:

- Introduce a new `Device` model separate from `Session`: rejected because it duplicates existing state without delivering meaningful benefit for R4.
- Provide only "sign out all other sessions" without listing them: rejected because the release explicitly calls for an active-sessions UI.

### 4. Account deletion uses a mixed cascade/tombstone strategy

Rationale: the release plan requires owned rooms to disappear, memberships elsewhere to be removed, and authored messages in other rooms to remain visible under a tombstone label. The safest approach is to:

- revoke all active sessions immediately,
- delete password-reset artifacts and profile assets owned only by that user,
- delete rooms the user owns through existing room-deletion invariants,
- remove the user from memberships/DM participation where ownership is not involved,
- rewrite retained authored-message identity to a tombstone representation before removing or anonymizing the user record.

This approach preserves conversation integrity while honoring destructive-account semantics.

Alternatives considered:

- Hard-delete the user and all authored messages everywhere: rejected because it would break conversation history outside owned rooms.
- Keep the user row forever with a `deletedAt` flag but no data cleanup: rejected because it leaves too much personally identifying data around for an explicit delete-account flow.

### 5. Large-history readiness is validated through bounded queries plus replayable fixtures

Rationale: the requirement is not "load everything faster" but "stay usable with at least 10k messages." That means R4 should preserve keyset pagination, verify the necessary indexes, seed a benchmark-sized room, and tune the virtualized list so the UI never attempts to mount the full history at once. Verification belongs in reproducible scripts/e2e checks, not subjective manual claims.

Alternatives considered:

- Add caching layers before measuring: rejected because the existing product shape should meet R4 with pagination/index work first.
- Depend only on manual browser checks: rejected because reviewers need evidence they can rerun.

### 6. Submission readiness is treated as product work, not post-hoc documentation

Rationale: README accuracy, compose healthchecks, seed/demo commands, and load-test scripts are all part of whether the submission is reviewable. They should live in a dedicated `submission-readiness` capability so they are tracked, tested, and archived like feature work rather than left as informal cleanup.

Alternatives considered:

- Scatter docs/scripts across unrelated specs: rejected because acceptance would become hard to reason about.

## Risks / Trade-offs

- **Account deletion touches many relations** -> Mitigation: implement deletion through well-scoped shared helpers plus transaction boundaries, and cover cascade/tombstone cases with unit/e2e tests.
- **Password reset can leak account existence or mishandle token reuse** -> Mitigation: constant-shape responses on request, hashed single-use tokens, expiry checks, and explicit `usedAt` invalidation.
- **10k-message verification may become flaky if measured against dev mode** -> Mitigation: run performance validation against the production-style stack and seeded fixtures only.
- **Load-test numbers may be environment-sensitive** -> Mitigation: check scripts and reporting into the repo, document host assumptions, and focus on reproducible p95 metrics rather than anecdotal screenshots.
- **README/setup drift between dev and prod compose files** -> Mitigation: treat both compose files as part of the same task set and update documentation in the same change as any environment change.

## Migration Plan

1. Add Prisma schema changes for reset tokens, profile/session metadata, and any indexes needed for history/session queries.
2. Apply migrations and update seed data/scripts so the stack can boot with reviewer-friendly demo accounts and performance fixtures.
3. Implement account-management APIs and shared helpers, including token issuance/consumption and account deletion orchestration.
4. Add settings/profile UI routes and wire them to the new APIs.
5. Tune/verify history queries and virtualization behavior for large seeded conversations.
6. Add operational artifacts: healthchecks, load-test scripts, benchmark/seeding helpers, README/submission updates.
7. Run typecheck, unit tests, targeted e2e, and the release-specific performance/load validations before marking R4 complete.

Rollback strategy: revert the R4 migration/application commit set and restore the pre-R4 database snapshot or disposable local volume when validating locally. Because password reset tokens and sessions are additive tables/columns, rollback is straightforward before production data exists.

## Open Questions

- Should avatar storage reuse the existing uploads volume/file-serving path, or should profile avatars remain a deferred polish item if the implementation cost is too high for R4?
- For tombstoned authored messages, should the preserved display label be a fixed string such as `Deleted user`, or should it retain a non-identifying stable placeholder per deleted account?
- Which tool (`k6` vs `artillery`) best matches the repo's current scripting/runtime constraints for the 300-client load test?
