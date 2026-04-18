# R0 Design

## Context

The repo ships a working app-skeleton: Dockerized Next.js 15 + Postgres 16 + Centrifugo v5, Prisma with a placeholder `User` migration, a TanStack Query provider, a Centrifugo connect-proxy that issues a dev-user token, a pino JSON logger, and Tailwind + shadcn/ui initialized. There is no auth, no rooms, no messages. R0 turns this into a classic web chat that two users can demo end-to-end without changing the Compose contract.

Scale target for R0 is the same as the whole product (300 concurrent users, rooms up to 1000 members, ≥10k messages per room usable in UI, 3 s send-to-receive budget), but only the pieces listed in scope are delivered now. Attachments, friends, AFK, moderation are explicitly deferred per the plan.

## Goals / Non-Goals

**Goals:**
- End-to-end classic chat demo: register two users, chat in a public room, DM by username, see presence + unread badges, stay signed in across reloads.
- `docker compose up` from a fresh clone still boots everything (no new manual steps).
- Message history is keyset-paginated and virtualized so the UI stays responsive well before R4 does perf work.
- Realtime delivery is authoritative for *delivery only*; Postgres is the source of truth for history.
- Per-browser sessions: signing out in one browser doesn't log out the user elsewhere; closing the browser doesn't log them out.
- One Prisma migration covers the full R0 schema — replacing the skeleton's placeholder migration — so the history is clean for reviewers.

**Non-Goals:**
- Attachments, multiline composer, edit/delete, reply, emoji (R1).
- Friends, blocks, AFK, typing indicators (R2).
- Admin/moderator roles, bans, invitations UI (R3; only the `owner`/`member` roles are stored now, `admin` reserved).
- Password reset, delete account, active-sessions UI, load testing, 10k-perf tuning (R4).
- Multi-node Centrifugo, bot API, admin dashboards (R5).
- Rate limiting, CAPTCHA, email verification (not in R0 acceptance).

## Decisions

### D1. Single consolidated R0 migration (replace placeholder)

The app-skeleton migration only creates a placeholder `User`. Rather than layering a diff migration on top of it, we will **reset migrations** and emit one `0001_r0_init` migration that creates the complete R0 schema. This is safe because:
- The project is pre-release and has no production data.
- Reviewers get a clean, readable schema history.
- `prisma migrate deploy` on fresh volumes behaves identically.

Alternative: additive migration on top of placeholder. Rejected — it splits the schema across two migrations with no history value and clutters review.

This decision is why the proposal flags a `Modified Capability` on `app-skeleton`: the "placeholder `User` table" scenario is replaced by "full R0 schema exists".

### D2. Session storage = DB-backed cookie sessions

We use a random opaque cookie → `Session` row keyed by `sha256(token)`. On each authenticated request, the server looks up the session row, hits `User`, and caches the result per request. No JWT for the web session.

Rationale:
- Per-spec requirement: "sign out ends this browser session only" — trivial with a row-per-browser model.
- We need `Session.lastSeenAt`, `userAgent`, `ip` anyway for the R4 active-sessions UI.
- Avoids JWT rotation complexity.

Centrifugo tokens remain HS256 JWTs (required by Centrifugo); they are short-lived (10 min) and issued per-connect from a valid web session.

Password hashing: **argon2id** via `argon2` (native addon already compiles cleanly in the Node alpine image). Fallback `bcryptjs` considered but rejected for hash strength.

### D3. Conversation-as-unifier

Rooms and DMs share a single `Conversation` table with a `type` discriminator. Messages, reads, and realtime channels all key on `conversationId`. Room-specific fields live in `Room`; DM-specific in `DmParticipant` + `Conversation.dmKey`.

- `Conversation.dmKey` is `min(userIdA, userIdB) + ':' + max(...)` for DMs, unique; NULL for rooms. This makes "find or create DM between A and B" a single upsert.
- `Message` only knows `conversationId` — no room/DM branching in message-writing code.
- Realtime channels: `room:{conversationId}` / `dm:{conversationId}`. Using conversation id (not room id) for rooms means the app layer doesn't need a join to resolve the channel from a message.

Alternative: separate `RoomMessage` / `DmMessage` tables. Rejected — doubles every query and makes virtualization/unread code branch.

### D4. Keyset pagination on `(createdAt DESC, id DESC)`

History endpoint is `GET /api/conversations/:id/messages?before=<ulid>&limit=50`. Messages use ULID ids so `id` is lexically monotonic and ties `createdAt`. The composite index `(conversationId, createdAt DESC, id DESC)` serves both the initial page and the infinite-scroll "older" page without `OFFSET`.

Alternative: cursor by `createdAt` only. Rejected — not tie-safe for same-ms messages.

### D5. Realtime: publish-from-server, subscribe-proxy for auth

- Clients connect to Centrifugo using a token issued by `POST /api/centrifugo/connect` (hardened to require a real session in all envs).
- Subscribe authorization uses Centrifugo's **subscribe proxy**: Centrifugo calls back `POST /api/centrifugo/subscribe` with `{ user, channel }`, and the app returns allow/deny based on membership (`RoomMember` for rooms, `DmParticipant` for DMs, `user == channelUser` for `user:{id}`).
- Server-side publish via Centrifugo HTTP API on `POST /api/conversations/:id/messages`, after the DB insert commits. The same handler publishes `unread.changed` to each recipient's `user:{id}` channel (skipping the author) and derives the recipient list from `RoomMember` / `DmParticipant`.

Rationale: subscribe proxy keeps authorization logic in one place (the Next.js app, with Prisma) and lets us enforce membership/bans in later releases without changing the client. Publishing server-side means Centrifugo never becomes a write path — Postgres is authoritative.

Alternatives considered:
- Client-publish with `allowed_publish` — rejected; clients could race DB writes and we'd lose the "persisted, then delivered" invariant.
- Private channels via token-embedded channel list — rejected; doesn't scale to "unlimited rooms per user".

### D6. Presence from Centrifugo `user:{id}` connection count

A user is online iff Centrifugo reports ≥1 client connected to `user:{id}`. We do **not** stand up a separate presence service. The subscribe-proxy, on first connect and on disconnect of the last client for a user, derives the transition and publishes `presence.changed` on `user:{targetId}` to anyone watching them. For R0, "anyone watching them" = every authenticated client; we publish to a shared `presence` channel plus the per-user channel. The members panel subscribes to `presence` and filters.

Alternative: compute presence in the app on each page load via Centrifugo's `presence` HTTP API. Rejected — not live, and the spec requires <2 s presence updates.

AFK is explicitly deferred; presence is binary online/offline in R0.

### D7. Unread = per-user `lastReadMessageId`

`MessageRead (conversationId, userId, lastReadMessageId)`. Unread count for a conversation is `COUNT(*) FROM Message WHERE conversationId = ? AND id > lastReadMessageId`. Because ids are ULID (monotonic), this count is index-only.

- Marking read: `POST /api/conversations/:id/read` upserts the row; publishes `unread.changed` on the user's own `user:{id}` so other tabs clear their badge.
- On message create: server publishes `unread.changed` to each recipient's `user:{id}` with a **delta** (`{conversationId, unreadDelta: 1}`) rather than recomputing. Clients merge into a Zustand `unreadMap`. Initial load seeds the map from a single `GET /api/me/unread` call returning `[{conversationId, unread}]`.

### D8. State split: Zustand vs TanStack Query vs local

- **TanStack Query**: room catalog (`['rooms', search]`), message pages (infinite query key `['conv', id, 'messages']`), my rooms list, my DM contacts list. All cacheable, server-authoritative, paginated.
- **Zustand**: `useAuthStore` (current user), `useConnectionStore` (Centrifugo state), `useUnreadStore` (conversationId → count), `useActiveConversationStore`. These are high-churn, UI-coordination, or global singletons.
- Live messages merge into the TanStack infinite query by prepending to the first page on `message.created`; we don't maintain a parallel Zustand list of messages.

### D9. UI: single shell + per-route panes

App shell renders the sidebar and the active pane's outlet. Routing:
- `/(app)/rooms` — catalog + "create room" button.
- `/(app)/rooms/[id]` — message list + members + composer.
- `/(app)/dm/[convId]` — message list + composer (no members panel).

Message list uses `Virtuoso` in reverse mode (`initialTopMostItemIndex`, `followOutput="smooth"` only when `atBottom`). "New messages" pill appears when `atBottom` is false and a `message.created` arrives.

Auth routes `(auth)/sign-in` and `(auth)/sign-up` use a minimal centered card layout; unauthenticated access to `(app)/*` redirects to sign-in.

## Risks / Trade-offs

- **Subscribe-proxy latency** → every channel subscribe is an HTTP round-trip to the app. For 300 users subscribing to ~20 rooms each this is ~6000 proxy calls on reconnect storms. Mitigation: keep the proxy handler cheap (single indexed query) and rely on Centrifugo's client resubscribe backoff. Revisit in R5 if Centrifugo scales horizontally.
- **Single-node Centrifugo** → fan-out works for 300 users on one node but presence across replicas is out of scope. Mitigation: documented as R5 concern.
- **Password hashing with argon2** → native addon adds build time and alpine compatibility risk. Mitigation: the base image (`node:20-alpine` with `apk add build-base python3`) already compiles it in app-skeleton image; keep those deps.
- **Message body cap at 3 KB** → enforced server-side with `zod`, but the client has no counter yet. Trade-off: acceptable in R0; polish in R4.
- **`dmKey` collision with user deletion** → deferred. No account deletion in R0.
- **No rate limiting on register/sign-in** → accepted for R0; noted as R4 hardening.
- **Online-dot accuracy when a user has many tabs** → transitions only on first-connect and last-disconnect; no flapping. If the proxy is briefly unreachable Centrifugo will retry, so worst case is a delayed offline blip (<5 s).
- **Replacing the skeleton migration** → acceptable pre-release; `docker compose down -v` is required for anyone with an existing `pgdata` volume. Documented in the change tasks.

## Migration Plan

1. Drop `prisma/migrations/*` produced by the skeleton; regenerate a single `0001_r0_init` with the full R0 schema.
2. `DATABASE_URL`, Centrifugo URLs, and `SESSION_SECRET` already in `.env.example`; R0 needs no new variables. Confirm during impl and update `.env.example` + README if that changes.
3. Deploy path: `docker compose down -v && docker compose up`. Called out in README under a "Resetting the database" note.

No rollback plan beyond "revert the merge"; pre-release repo.

## Open Questions

- Do we gate the `/(app)` routes via a Next.js middleware (cookie-only check) or per-route server component (DB check)? Leaning middleware-for-redirect + per-request server check; confirm during impl.
- Seed script: do we ship a minimal seed (two users + one public room) in R0 to accelerate review? Plan currently defers seed to R4 but a tiny optional seed would be cheap; decide during tasks.
