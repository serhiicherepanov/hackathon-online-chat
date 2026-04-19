# Roadmap

Tracking the delivery of the online-chat hackathon project against the phased
[release plan](docs/plan/index.md). Each release is a self-contained, demo-able
product; `docker compose up` must stay green at the end of every release.

Legend: `[x]` done · `[~]` in progress · `[ ]` not started · `[-]` deferred/stretch

## Status overview

| Release | Theme | Status |
|---------|-------|--------|
| [R0 — Demo-able MVP](docs/plan/r0-mvp.md) | Compose, auth, rooms, DMs, realtime text, unread, presence | **done** |
| [R1 — Rich Messaging](docs/plan/r1-rich-messaging.md) | Attachments, reply, edit, delete, multiline, emoji | **done** |
| [R2 — Social & Presence](docs/plan/r2-social-presence.md) | Friends, blocks, AFK/multi-tab, typing | **done** |
| [R3 — Moderation & Admin](docs/plan/r3-moderation.md) | Roles, bans, invitations, Manage Room | **done** |
| [R4 — Polish & Submission](docs/plan/r4-polish-scale.md) | Password reset, account delete, sessions UI, 10k-msg perf, 300-client load test | **done** |
| [R5 — Advanced (stretch)](docs/plan/r5-advanced.md) | Multi-node Centrifugo + Redis, bot API, admin dashboards | stretch |

## R0 — Demo-able MVP

- [x] Docker Compose: `app`, `db` (Postgres 16), `centrifugo` v5; uploads volume reserved
- [x] Auth: register, sign-in, sign-out, persistent cookie session (per-browser invalidation)
- [x] Rooms: create (name/description/visibility), public catalog with search, join/leave, owner-can't-leave, `DELETE /api/rooms/:id` for owner
- [x] DMs: 1:1 auto-created by username (no friend gating yet)
- [x] Messages: plain text ≤3 KB, Postgres-persisted, chronological, offline delivery on reconnect
- [x] Realtime fan-out via `room:{id}` and `dm:{id}` channels
- [x] Unread badges on rooms + DMs; cleared on open
- [x] Basic presence: `online` / `offline` only via `user:{id}` channel
- [x] UI shell: top nav, sidebar (Rooms + DMs accordion), main chat, members panel, single-line composer
- [x] Infinite scroll (Virtuoso, reverse keyset pagination) with "new messages" pill when scrolled up
- [x] `.env.example` with every required variable
- [x] R0 demo script passes end-to-end (see [r0-mvp.md §Acceptance](docs/plan/r0-mvp.md))

## R1 — Rich Messaging

- [x] Multiline composer (Enter sends, Shift+Enter newline, autosize)
- [x] Emoji: inline popover picker + OS shortcut
- [x] Reply/quote: composer banner, outlined quote block, click-to-scroll
- [x] Edit own message with "edited" indicator (live)
- [x] Delete own message (soft-delete, live removal)
- [x] Attachments: upload button + clipboard paste; per-attachment comment; original filename preserved
- [x] Server-side size limits: 20 MB file, 3 MB image
- [x] `GET /api/files/:id` gated by membership / DM-participant re-check
- [x] Prisma: `Message.replyToId`, `editedAt`, `deletedAt`; `Attachment` model; `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}` layout
- [x] APIs: `POST /api/uploads`, extended `POST /api/conversations/:id/messages`, `PATCH`/`DELETE /api/messages/:id`, `GET /api/files/:id`
- [x] Realtime: `message.updated`, `message.deleted`
- [x] Author-echo insert (server response placed into cache immediately; live event dedupes)
- [~] Full optimistic send with upload progress in composer (author-echo covers send; progress UI pending)
- [x] R1 demo script passes end-to-end (e2e/r1-acceptance.spec.ts, 5/5 green)

## R2 — Social & Presence

- [x] Friends: request / accept / reject / remove (`GET/POST /api/friends*`, `DELETE /api/friends/:userId`)
- [x] DM gating: new `POST /api/dm/:username` requires accepted friendship + no active block; grandfathered DMs still reused
- [x] Blocks with frozen DM history: `POST/DELETE /api/blocks*`, `dm.frozen` event, read-only composer + banner
- [x] Typing indicators on rooms and DMs (throttled publish, 3 s local expiry, suppressed on empty composer / frozen DM)
- [x] Heartbeat-driven AFK (1 min idle across all tabs) — multi-tab aware via `lastActiveAt` + Centrifugo connection count
- [x] Presence state machine: online / AFK / offline, surfaced in members list, DM contacts, and `/contacts` page
- [x] Contacts screen at `/contacts` with accepted friends, inbound/outbound requests, and blocked users
- [x] R2 demo script passes end-to-end (e2e/r2-acceptance.spec.ts)

## R3 — Moderation & Admin

- [x] Room roles: `owner`, `admin`, `member`
- [x] Invitations flow for private rooms
- [x] Bans (room-level) + user-level removal; ban-aware file access
- [x] Manage Room dialog and room header actions (members, admins, banned, invitations, owner-only settings)
- [x] Owner-only room settings and destructive delete flow (cascade messages + attachments)
- [x] Admin edit/delete of others' messages
- [x] R3 demo script passes end-to-end

## R4 — Polish & Submission

- [x] Password reset (email token flow)
- [x] Delete account (cascade: sessions, memberships, messages per spec)
- [x] Active sessions UI (list + revoke other sessions)
- [x] 10k-message room performance pass (pagination, Virtuoso tuning, indexes)
- [x] 300-concurrent-client load test + documented latency metrics (`pnpm loadtest:realtime`)
- [x] README finalized, seed script for reviewer, submission checklist green
- [x] R4 demo script passes end-to-end (`e2e/r4-account-management.spec.ts`)

## R5 — Advanced (stretch)

- [-] Multi-node Centrifugo with Redis engine
- [-] Bot / integration HTTP API
- [-] Realtime admin dashboards

## Updating this file

- Flip a task to `[x]` in the same change that lands it.
- When a release's demo script passes end-to-end, update the **Status overview**
  row and the release page in [`docs/plan/index.md`](docs/plan/index.md).
- Keep scope aligned with the authoritative release docs under `docs/plan/`;
  if scope changes, update both files in the same commit.
