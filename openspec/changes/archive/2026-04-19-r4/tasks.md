## 1. Schema and shared foundations

- [x] 1.1 Extend `prisma/schema.prisma` for R4 account-management data (`PasswordResetToken`, any added `User` profile fields, and any `Session` metadata/index updates needed by sessions UI)
- [x] 1.2 Add and validate the Prisma migration for the new tables/columns plus any message-history/session indexes required by the R4 specs
- [x] 1.3 Add shared helpers for password-reset token issuance/verification, session serialization, and tombstone/account-deletion planning

## 2. Password reset and settings APIs

- [x] 2.1 Implement `POST /api/auth/password/reset` with generic success responses, reset-token persistence, and the configured dev/test delivery path
- [x] 2.2 Implement `POST /api/auth/password/reset/confirm` with expiry, single-use validation, and password-hash replacement
- [x] 2.3 Implement `POST /api/auth/password/change` for authenticated users with current-password verification
- [x] 2.4 Implement `PATCH /api/profile` for the editable R4 profile fields

## 3. Active sessions management

- [x] 3.1 Implement `GET /api/sessions` to list the caller's active sessions with browser/IP/last-seen metadata and current-session identification
- [x] 3.2 Implement `DELETE /api/sessions/:id` so revoking one session invalidates only the targeted browser session
- [x] 3.3 Add shared auth/session tests covering session listing visibility and selective revocation

## 4. Account deletion orchestration

- [x] 4.1 Implement an account-deletion service that revokes sessions, deletes owned rooms, removes surviving memberships/DM access, and tombstones authored messages in surviving conversations
- [x] 4.2 Expose `DELETE /api/account` with confirmation-safe validation and response/error handling for the destructive flow
- [x] 4.3 Add tests for the deletion cascade/tombstone contract, including owned-room removal and preserved non-owned history

## 5. Settings and recovery UI

- [x] 5.1 Add signed-in settings/profile routes or views for profile editing, password change, and active-session management
- [x] 5.2 Add a logged-out password-reset request/confirm flow that matches the new APIs and dev delivery path
- [x] 5.3 Add the delete-account confirmation UI with explicit impact copy and required confirmation interaction
- [x] 5.4 Add polished loading and empty states for the new settings surfaces and any related reviewer-facing panels

## 6. Large-history readiness

- [x] 6.1 Audit and update message history queries/index usage so `GET /api/conversations/:id/messages` stays keyset-paginated and index-backed for large conversations
- [x] 6.2 Seed or script a benchmark fixture that creates a room with at least 10,000 messages for repeatable local validation
- [x] 6.3 Tune the conversation UI/virtualization path as needed so the 10k-message fixture remains usable without full-history rendering

## 7. Submission-readiness artifacts

- [x] 7.1 Add compose/app readiness wiring and healthchecks needed for a reviewer to tell when the stack is actually ready
- [x] 7.2 Add or update seed/bootstrap commands and demo-account guidance for reviewer-friendly setup
- [x] 7.3 Add a repeatable load-test script/reporting path for approximately 300 concurrent realtime clients and documented latency metrics
- [x] 7.4 Update `README.md`, `.env.example`, and any release/submission docs to match the real R4 setup, URLs, and demo flow

## 8. Verification

- [x] 8.1 Add Vitest coverage for password-reset token lifecycle, session revocation, and account-deletion planning helpers
- [x] 8.2 Add end-to-end coverage for password reset, active-session revocation, and delete-account behavior
- [x] 8.3 Run `pnpm typecheck` and `pnpm test` with the required timeout/logging wrapper after the implementation lands
- [ ] 8.4 Run the R4-specific large-history and load/performance verification commands and capture the resulting artifacts/logs
