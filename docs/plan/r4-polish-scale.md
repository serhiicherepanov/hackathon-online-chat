# R4 — Polish & Submission

Goal: close the remaining account-management gaps, hit the non-functional
numbers, and make the repo submission-ready. Items here are deliberately last
because they are either low visual impact (active sessions UI, password reset)
or require the rest of the app to already exist before they can be benchmarked
(10k-history perf, 300-client load test).

Builds on [R3](r3-moderation.md).

## Scope (in)

- Password reset flow (token delivered via console / email log in dev; pluggable transport).
- Password change for logged-in users.
- Account deletion: remove user, cascade-delete only rooms they own (and their messages/files), strip membership elsewhere, leave authored messages in other rooms attributed to a tombstone label.
- Active sessions screen: list with browser/IP/last-seen, revoke individual sessions. (Sign-out already scopes to current browser since R0; this release exposes the full management UI.)
- Profile screen: avatar upload, display name, timezone-safe timestamps.
- Performance: room with 10 000 messages remains smooth (Virtuoso tuning, index audit, keyset queries verified).
- Concurrency: load test with ~300 synthetic WS clients; tune Centrifugo and Next.js limits.
- DB migrations production-ready; seed script for demo data.
- README with setup, env vars, demo accounts, architecture diagram.
- Health check endpoints; Compose `healthcheck` entries; app waits for db + centrifugo on boot.

## Data model additions

- `User.avatarUrl`, `User.displayName`
- `PasswordResetToken` — id, userId, tokenHash, expiresAt, usedAt
- Indexes reviewed: `(conversationId, createdAt DESC, id)` on `Message`, `(userId, lastSeenAt DESC)` on `Session`, `(roomId, userId)` on `RoomMember`/`RoomBan`.

## API additions

- `POST /api/auth/password/reset` (request), `POST /api/auth/password/reset/confirm`
- `POST /api/auth/password/change`
- `DELETE /api/account` — cascade as specified
- `PATCH /api/profile`, `POST /api/profile/avatar`
- `GET /api/sessions`, `DELETE /api/sessions/:id` — active sessions management

## Non-functional checks

- Load test script (k6 or artillery) in `scripts/loadtest/`:
  - 300 concurrent WS clients across mixed rooms
  - Message delivery p95 < 3 s
  - Presence change p95 < 2 s
- Virtuoso: scroll from bottom to top of a 10k-message room without sustained main-thread stalls > 100 ms.
- Bundle check: no server-only imports leak into the client bundle.

## UI additions

- `/profile`, `/settings/password`, `/settings/sessions` consolidated under a settings area.
- "Delete account" dangerous action with typed-confirmation dialog listing impact (rooms that will be deleted).
- Loading skeletons and empty states across sidebar, catalog, conversation.

## Acceptance criteria

1. Fresh clone → `docker compose up` → app reachable on documented URL with seed users ready for demo.
2. Load-test script reports message delivery p95 < 3 s and presence p95 < 2 s under 300 clients.
3. 10k-message room scroll-to-top completes without sustained main-thread stalls > 100 ms (Performance panel).
4. Password reset flow works end-to-end via dev transport (logged link).
5. Owner deletes their account → only their owned rooms vanish; membership in other rooms is removed; their messages elsewhere are retained under a tombstone label.
6. Active sessions screen lists all sessions, revoking one terminates only that browser.
7. README is sufficient for a reviewer with zero prior context to run and demo the app.
