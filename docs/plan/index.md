# Release Plan

Phased delivery plan for the online-chat hackathon project.

**Priority principle (hackathon-first):** every release is a self-contained,
demo-able product. The most globally useful features land as early as possible;
expensive features with low judge-visibility (AFK/multi-tab, active sessions,
password reset, 10k-message perf) are deferred to later releases. `docker compose up`
must remain green at the end of every release.

Authoritative spec: [`REQUIREMENTS.md`](../../REQUIREMENTS.md) → [`docs/index.md`](../index.md).
Architecture baseline: [`AGENTS.md`](../../AGENTS.md).

## Releases

| Release | Theme | Status |
|---------|-------|--------|
| [R0 — Demo-able MVP](r0-mvp.md) | Compose, auth, rooms (public + private flag), DMs, realtime text, unread badges, online/offline presence | done |
| [R1 — Rich Messaging](r1-rich-messaging.md) | Attachments (files + images), reply, edit, delete, multiline, emoji | done |
| [R2 — Social & Presence](r2-social-presence.md) | Friends, blocks with frozen DMs, AFK/multi-tab, typing indicators | done |
| [R3 — Moderation & Admin](r3-moderation.md) | Roles, bans, invitations, Manage Room modal, owner-only actions | done |
| [R4 — Polish & Submission](r4-polish-scale.md) | Password reset, delete account, active sessions UI, 10k-message perf, 300-client load test, README, seed | done |
| [R5 — Advanced (stretch)](r5-advanced.md) | Multi-node Centrifugo + Redis, bot/integration API, realtime admin dashboards | stretch |

## Release-to-demo script

After each release the reviewer should be able to:

- **R0** — register two users, create a public room, chat live in the room, open a DM, see unread badges + online/offline dots.
- **R1** — send an image by paste, a 15 MB file, reply to a message, edit and delete own message.
- **R2** — send a friend request, accept it, block a user (frozen DM), go AFK in two tabs, see typing.
- **R3** — create a private room, invite a user, make an admin, ban a member, delete a room.
- **R4** — reset password, delete account (cascades), run realtime load test (`pnpm loadtest:realtime`) for ~300 clients and check JSON latency metrics.

## Conventions

- **Additive specs**: each `rX.md` lists only what it *adds* to the previous release.
- **Acceptance**: every release has a short demo script that must pass before moving on.
- **Deferrals**: features explicitly out of scope are listed to avoid creep.
- **Done = runnable**: `docker compose up` → open browser → demo script succeeds.

## Cross-cutting constraints (apply to every release)

- All services defined in `docker-compose.yml` at repo root.
- Next.js owns persistence and authorization; Centrifugo only delivers events.
- TanStack Query for paginated/cacheable server data; Zustand for active-room / UI / live-merge state.
- React Virtuoso for any list that can grow (messages, catalog, members).
- Type-strict TS; Prisma is the single source of truth for the schema.
