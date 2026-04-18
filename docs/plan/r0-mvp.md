# R0 — Demo-able MVP

Goal: after R0 the product is already a working classic web chat you can demo
end-to-end: two users register, chat in a public room, DM each other, see who
is online, and see unread badges. `docker compose up` produces the full stack.

This is deliberately larger than a minimal skeleton so that R0 alone is
submission-worthy if the hackathon clock runs out.

## Scope (in)

- Docker Compose: `app` (Next.js 15), `db` (Postgres 16), `centrifugo` (v5). Uploads volume reserved (unused until R1).
- Auth: register, sign-in, sign-out, persistent cookie session. Sign-out invalidates only the current browser's session row.
- Rooms:
  - Create with `name` (unique), `description`, `visibility` (`public` | `private`).
  - Public catalog with search + member count. Private rooms are simply hidden from the catalog at this stage (invitation flow itself lands in R3).
  - Join public rooms, leave rooms. Owner cannot leave (API rejects); deletion UI arrives in R3 but `DELETE /api/rooms/:id` is implemented now for owners.
- DMs:
  - 1:1 conversation auto-created on first message by username, no friend gating yet (gating is enforced in R2).
  - Same message model and realtime plumbing as rooms.
- Messages: plain text, UTF-8, ≤3 KB, Postgres-persisted, chronological order, offline delivery on next connect.
- Realtime fan-out via `room:{id}` and `dm:{id}` channels.
- Unread badges on rooms and DM contacts; cleared when the chat is opened.
- Basic presence: `online` / `offline` only (no AFK yet — AFK is visually noisy and costly to get right; defer to R2).
- UI layout from wireframes: top nav, right sidebar (rooms + DM contacts accordion), main chat, members panel, composer (single-line for now — multiline lands in R1).
- Infinite scroll (reverse keyset pagination) with React Virtuoso. Autoscroll only when pinned to bottom; scrolled-up state shows a "new messages" pill.
- `.env.example` with every required variable.

## Out of scope (deferred)

- Attachments, reply, edit, delete, multiline, emoji → R1
- Friends, blocks, AFK, typing → R2
- Admin roles, bans, invitations, Manage Room modal → R3
- Password reset, delete account, active sessions UI, load test, 10k-history perf tuning → R4

## Data model (Prisma)

- `User` — id, email⧉, username⧉ (immutable), passwordHash, createdAt
- `Session` — id, userId, tokenHash, userAgent, ip, createdAt, lastSeenAt
- `Conversation` — id, type (`room` | `dm`), dmKey⧉nullable (sorted `userA:userB` for DMs), createdAt
- `Room` — id, name⧉, description, visibility (`public` | `private`), ownerId, conversationId
- `RoomMember` — roomId, userId, role (`owner` | `member`); unique(roomId,userId). `admin` role value reserved for R3.
- `DmParticipant` — conversationId, userId (exactly two rows per DM)
- `Message` — id (ULID), conversationId, authorId, body, createdAt; index (conversationId, createdAt DESC, id)
- `MessageRead` — conversationId, userId, lastReadMessageId, updatedAt — drives unread badges from day one

## API surface

- `POST /api/auth/register`, `POST /api/auth/sign-in`, `POST /api/auth/sign-out`
- `GET /api/rooms?search=` — catalog (public only)
- `POST /api/rooms` — create, `DELETE /api/rooms/:id` — owner deletes (cascade messages)
- `POST /api/rooms/:id/join`, `POST /api/rooms/:id/leave` (owner rejected)
- `POST /api/dm/:username` — ensures DM conversation, returns id
- `GET /api/conversations/:id/messages?before=<ulid>&limit=50`
- `POST /api/conversations/:id/messages` — persists + publishes to Centrifugo
- `POST /api/conversations/:id/read` — sets `lastReadMessageId`
- `POST /api/centrifugo/connect`, `POST /api/centrifugo/subscribe` — token issuance + per-channel authorization proxy

## Realtime channels

- `room:{roomId}` — `message.created`
- `dm:{convId}` — `message.created`
- `user:{userId}` — `unread.changed`, `presence.changed`
- Presence: a user is online if they have ≥1 Centrifugo client connected on `user:{id}`, otherwise offline. AFK computation is deferred to R2.

## UI

- Routes: `/(auth)/sign-in`, `/(auth)/sign-up`, `/(app)/rooms`, `/(app)/rooms/[id]`, `/(app)/dm/[convId]`.
- Components: `AppShell`, `Sidebar` (Rooms + DMs accordion), `RoomCatalog`, `MessageList` (Virtuoso), `MessageComposer` (single-line), `MemberList` with online/offline dot, `UnreadBadge`.
- shadcn/ui primitives only; Tailwind tokens for spacing/colors.

## Acceptance criteria (demo script)

1. `docker compose up` from repo root boots app, db, centrifugo with no manual steps.
2. User A registers, creates public room `general`; user B registers and joins from catalog search.
3. A sends a message → appears in B's window within 3 s without refresh; B's sidebar shows an unread badge if the room isn't active, cleared on open.
4. A opens a DM with B by username and sends a message → B sees it live and gets a DM-unread badge.
5. A closes all browser windows → B sees A's dot turn to offline. A reopens and is still signed in; dot turns online.
6. B scrolls up past the initial page → older messages load automatically; while scrolled up, new messages do not force-scroll and surface via a "new messages" pill.
7. Signing out in one browser does not sign the same user out in a second browser logged in concurrently.
8. Room owner calling `POST /api/rooms/:id/leave` receives a 4xx error; non-owners succeed.
