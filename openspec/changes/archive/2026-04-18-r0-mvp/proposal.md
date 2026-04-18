# R0 — Demo-able MVP

## Why

The repository currently has only the scaffolded app-skeleton (Compose, Next.js, Prisma, Centrifugo wiring) but no chat features. R0 turns the skeleton into an end-to-end classic web chat that two users can demo live: register, chat in a public room, DM each other, see who is online, and see unread badges. Per the plan, R0 is sized to be submission-worthy on its own if the clock runs out.

## What Changes

- **Authentication**: email/username/password register, sign-in, sign-out with persistent cookie sessions; per-browser `Session` rows so signing out one browser does not affect others.
- **Rooms**: create with `name` (unique), `description`, `visibility` (`public` | `private`); public catalog with search; join/leave (owner cannot leave); `DELETE /api/rooms/:id` for owners (cascades messages).
- **Direct messages**: 1:1 conversation auto-created on first message by username (no friend gating yet); same message model and realtime plumbing as rooms.
- **Messages**: plain text, UTF-8, ≤3 KB, Postgres-persisted, chronological order; keyset-paginated history; offline delivery on next connect.
- **Realtime fan-out** via Centrifugo channels `room:{id}`, `dm:{id}`, `user:{id}`; subscribe-proxy authorization in the Next.js app.
- **Unread badges** per conversation via `MessageRead.lastReadMessageId`; cleared when chat is opened; live-updated over `user:{id}`.
- **Presence**: basic `online` / `offline` only, derived from Centrifugo `user:{id}` connection count (no AFK yet).
- **UI**: app shell with top nav, right sidebar (Rooms + DM contacts accordion), main chat pane (React Virtuoso + reverse keyset infinite scroll, pinned-to-bottom autoscroll, "new messages" pill), members panel with presence dots, single-line composer.
- **Env**: `.env.example` extended with any new R0 variables.

## Capabilities

### New Capabilities
- `auth`: email/password registration, sign-in, sign-out, and per-browser persistent sessions.
- `rooms`: room creation, public catalog, membership lifecycle (join/leave/owner-delete), and private visibility flag.
- `direct-messages`: 1:1 conversation lookup/creation by username and DM message plumbing.
- `messages`: persisted conversation messages with keyset-paginated history and a send endpoint that fans out via Centrifugo.
- `realtime`: Centrifugo channel contract and subscribe-proxy authorization for `room:{id}`, `dm:{id}`, and `user:{id}`.
- `unread-badges`: per-conversation unread tracking via `MessageRead` with live updates on `user:{id}`.
- `presence`: online/offline status derived from Centrifugo `user:{id}` connections, published to interested clients.
- `chat-ui`: app shell, sidebar, room catalog, virtualized message list with infinite scroll, composer, and members panel.

### Modified Capabilities
- `app-skeleton`: Prisma `User` model is extended from a placeholder to the full R0 data model (users + sessions + conversations + rooms + memberships + DMs + messages + reads). Uniqueness invariants on `User.email` and `User.username` stay intact; the skeleton's "placeholder `User` table" requirement is superseded by the richer schema.

## Impact

- **Schema**: initial R0 Prisma migration adding `Session`, `Conversation`, `Room`, `RoomMember`, `DmParticipant`, `Message`, `MessageRead`; `User` gains `passwordHash`. Replaces the placeholder-only `User` migration from the skeleton.
- **API routes** under `app/api/`: `auth/{register,sign-in,sign-out}`, `rooms` (+ `:id`, `:id/join`, `:id/leave`), `dm/:username`, `conversations/:id/messages`, `conversations/:id/read`, and `centrifugo/{connect,subscribe}` (the existing `connect` is hardened to use real sessions).
- **Client**: new app routes `(auth)/sign-in`, `(auth)/sign-up`, `(app)/rooms`, `(app)/rooms/[id]`, `(app)/dm/[convId]`; Zustand stores for active conversation, connection state, and unread map; TanStack Query hooks for catalog and message history.
- **Realtime**: Centrifugo `proxy` config for connect + subscribe pointing at the Next.js app; server-side publish via Centrifugo HTTP API on message create.
- **Dependencies**: add `argon2` (or `bcryptjs`) for password hashing, `zod` for request validation, `ulid` for message ids, `iron-session` (or equivalent) for cookie sessions.
- **README**: Setup / env-var / demo-script sections updated to match R0 reality per the living-README rule.
