## Why

R0-R2 established the core chat product, but the repo still is not submission-ready: account lifecycle gaps remain, reviewer setup is not fully streamlined, and the required scale/performance targets are not yet captured as implementation work. R4 closes those gaps so the project can be demonstrated, validated, and handed to reviewers as a polished release rather than a feature prototype.

## What Changes

- Add account-management flows for password reset, password change, profile updates, active session listing/revocation, and destructive account deletion with clearly defined cascade behavior.
- Add release-readiness work for seed/demo data, health/boot hardening, reviewer-facing documentation, and explicit non-functional validation artifacts for 10k-message history and ~300 concurrent realtime clients.
- Strengthen the conversation/history contract so large rooms remain usable through verified pagination, indexing, and virtualization expectations rather than best-effort behavior.
- Expand the signed-in UI with settings/profile surfaces, safer destructive actions, and loading/empty states needed for a polished submission demo.

## Capabilities

### New Capabilities

- `account-management`: Password reset/change, profile management, active sessions, and account deletion flows for authenticated users and account recovery.
- `submission-readiness`: Demo seed data, health and startup readiness checks, README/submission documentation, and reproducible load/performance verification artifacts.

### Modified Capabilities

- `messages`: Tighten large-history requirements so 10k-message rooms remain smooth via keyset pagination, indexing, and virtualized rendering expectations.
- `chat-ui`: Add settings/profile routes, active-sessions and delete-account UX, and polish states required for the final reviewer-facing experience.
- `app-skeleton`: Extend the base stack contract with submission-ready startup behavior, healthchecks, and documented seed/bootstrap flow.

## Impact

- Affected areas include the Prisma schema (`User`, `Session`, password reset tokens), auth/account route handlers, settings/profile UI, message history queries/indexes, and supporting scripts/docs under `scripts/`, Compose files, and `README.md`.
- Adds new account APIs, new settings routes, and operational artifacts for load/performance verification and reviewer bootstrapping.
- Requires updates to tests, seed data, and release docs so R4 can be verified end-to-end instead of remaining a narrative plan item.
