## 1. Data model & dependencies

- [x] 1.1 Add runtime deps: `argon2`, `zod`, `ulid`, `iron-session` (or equivalent session lib)
- [x] 1.2 Extend Prisma schema with `Session`, `Conversation`, `Room`, `RoomMember`, `DmParticipant`, `Message`, `MessageRead`; add `passwordHash` to `User`; add composite index on `Message(conversationId, createdAt, id)`; add `Conversation.dmKey` unique nullable
- [x] 1.3 Drop the placeholder migration and regenerate a single `0001_r0_init` migration covering the full R0 schema
- [x] 1.4 Regenerate Prisma client; run `prisma migrate deploy` in app Docker entrypoint (already present) still works

## 2. Auth capability

- [x] 2.1 Add `lib/auth/session.ts` helpers: create session (hashes token, writes row, sets cookie), resolve session from cookie, delete session, `requireUser()` helper for route handlers
- [x] 2.2 Add `lib/auth/password.ts` with argon2id hash/verify
- [x] 2.3 `POST /api/auth/register` (zod validation, unique email/username, creates user + session)
- [x] 2.4 `POST /api/auth/sign-in` (accepts email or username, verifies password, creates session)
- [x] 2.5 `POST /api/auth/sign-out` (deletes caller's session row, clears cookie)
- [x] 2.6 `GET /api/auth/me` (returns current user, updates `Session.lastSeenAt`)
- [x] 2.7 Next.js middleware to redirect unauthenticated `/(app)/*` → `/sign-in` and authenticated `/sign-in`|`/sign-up` → `/rooms`

## 3. Rooms capability

- [x] 3.1 `POST /api/rooms` — validate input, enforce unique name, create `Conversation(type=room)` + `Room` + owner `RoomMember` in a tx
- [x] 3.2 `GET /api/rooms?search=` — public-only list with memberCount and caller `isMember`
- [x] 3.3 `POST /api/rooms/:id/join` — idempotent join for public rooms; reject private
- [x] 3.4 `POST /api/rooms/:id/leave` — non-owner leave; owner gets `409 owner_cannot_leave`
- [x] 3.5 `DELETE /api/rooms/:id` — owner-only cascade delete (Room, Conversation, RoomMember, Message, MessageRead) in a tx
- [x] 3.6 `GET /api/me/rooms` — memberships for current user
- [x] 3.7 `GET /api/rooms/:id/members` — members list (enforce private-room membership check)

## 4. Direct messages capability

- [x] 4.1 `POST /api/dm/:username` — resolve target user, reject self-DM, compute sorted `dmKey`, upsert `Conversation(type=dm, dmKey)` + two `DmParticipant` rows in a tx, return `conversationId` + peer
- [x] 4.2 `GET /api/me/dm-contacts` — list DM conversations for current user

## 5. Messages capability

- [x] 5.1 `lib/conversations/access.ts` helper: `assertMember(conversationId, userId)` that branches on `Conversation.type` (room → `RoomMember`, dm → `DmParticipant`) — used by all message + read endpoints
- [x] 5.2 `POST /api/conversations/:id/messages` — validate body (≤3072 bytes, non-empty after trim), generate ULID, insert `Message`, then call Centrifugo publish for channel + per-recipient `user:{id}` `unread.changed` delta
- [x] 5.3 `GET /api/conversations/:id/messages?before=&limit=` — keyset pagination (default 50, cap 100), returns `{ messages, nextCursor }`
- [x] 5.4 `POST /api/conversations/:id/read` — upsert `MessageRead` (never move backward), publish `unread.changed{unread:0}` to caller's `user:{id}`

## 6. Realtime capability

- [x] 6.1 Harden `POST /api/centrifugo/connect` to require a session cookie in all envs and set `sub=userId`
- [x] 6.2 `POST /api/centrifugo/subscribe` — subscribe-proxy endpoint that allows channels based on `room:{id}` membership, `dm:{id}` participation, `user:{id}` identity match, and `presence` for any authed user; otherwise reject
- [x] 6.3 Update `centrifugo/config.json` to declare connect proxy + subscribe proxy (+ presence enabled), wire API key for server-side publishes
- [x] 6.4 `lib/centrifugo/publish.ts` server helper wrapping Centrifugo HTTP API (`publish`, `broadcast`) with logging on failure
- [x] 6.5 Presence transition detection: use Centrifugo channel events (or its presence callback/proxy) to publish `presence.changed` only on first-connect and last-disconnect of `user:{id}`; emit on `presence` channel + `user:{id}`
- [x] 6.6 `GET /api/presence?userIds=` — query Centrifugo presence info for the requested `user:{id}` channels, cap at 1000 ids

## 7. Unread & presence snapshots

- [x] 7.1 `GET /api/me/unread` — per-conversation counts via `COUNT(*) WHERE id > COALESCE(lastReadMessageId, '')`
- [x] 7.2 Zustand `useUnreadStore` with `set/merge delta/clear(conversationId)`; seeded from `/api/me/unread` on app shell mount
- [x] 7.3 Consume `unread.changed` on `user:{id}`: ignore when matching conversation is active in current tab (mark read instead); else merge delta

## 8. Client providers & stores

- [x] 8.1 Single Centrifugo client instance in `components/providers/centrifuge-provider.tsx`, connects on authenticated mount, disconnects on sign-out; expose React context with `client` + `status`
- [x] 8.2 Zustand stores: `useAuthStore` (current user), `useConnectionStore` (centrifugo status), `useActiveConversationStore`, `useUnreadStore` (see 7.2)
- [x] 8.3 TanStack Query hooks: `useRoomCatalog(search)`, `useMyRooms()`, `useMyDmContacts()`, `useMembers(roomId)`, `useMessageHistory(convId)` (infinite query keyed by `['conv', id, 'messages']`)
- [x] 8.4 `useLiveMessages(convId)` — subscribes to the conversation channel and prepends `message.created` payloads into the infinite query's first page (dedupe by id)

## 9. App shell & routing UI

- [x] 9.1 Add shadcn components: `button`, `input`, `label`, `form`, `dialog`, `dropdown-menu`, `avatar`, `scroll-area`, `separator`, `badge`, `accordion`, `tooltip`, `sheet` (or skeleton) as needed via `npx shadcn@latest add`
- [x] 9.2 Auth routes: `app/(auth)/sign-in/page.tsx`, `app/(auth)/sign-up/page.tsx` with shared centered-card layout
- [x] 9.3 App shell `app/(app)/layout.tsx`: top nav (app name + user menu with sign-out), right sidebar with Rooms + DM accordions, content outlet, Centrifugo provider, error boundary
- [x] 9.4 `app/(app)/rooms/page.tsx` — public catalog with debounced search, Create-room modal, Join/Open actions
- [x] 9.5 `app/(app)/rooms/[id]/page.tsx` — conversation view with members panel
- [x] 9.6 `app/(app)/dm/[convId]/page.tsx` — DM conversation view (no members panel)
- [x] 9.7 Start-DM flow from sidebar: small "+ New DM" action that prompts for username and calls `POST /api/dm/:username`, then navigates

## 10. Message list, composer, presence UI

- [x] 10.1 `MessageList` component using `Virtuoso` in reverse mode with `startReached` loading older pages via infinite query `fetchPreviousPage`
- [x] 10.2 Autoscroll-when-pinned + "new messages" pill (tracks `atBottom` state)
- [x] 10.3 On mount / tab-visible / new message while active → call `POST /api/conversations/:id/read`
- [x] 10.4 `MessageComposer` single-line, Enter submits, 413 shows inline error and keeps content
- [x] 10.5 `MemberList` with online-dot: seed from `GET /api/presence?userIds=`, update on `presence.changed` from the `presence` channel
- [x] 10.6 Error boundaries around Centrifugo provider, message list, and Virtuoso renderer with Retry that calls `reset()` + refetches the relevant query

## 11. Server publish plumbing

- [x] 11.1 In `POST /api/conversations/:id/messages`, after DB commit, derive recipient user ids (`RoomMember` for rooms, other `DmParticipant` for DMs) and emit `unread.changed{unreadDelta:1}` to each `user:{id}` (skip author)
- [x] 11.2 Publish `message.created` on `room:{convId}` or `dm:{convId}` depending on `Conversation.type`
- [x] 11.3 Never fail the HTTP response if a Centrifugo publish fails; log and return `201`

## 12. README & env

- [x] 12.1 Update `.env.example` if any new variables were introduced during implementation (expected: none; verify)
- [x] 12.2 Update `README.md` to describe the delivered R0: register/sign-in, create/join rooms, DM by username, presence, unread badges; add a "Resetting the database" note (`docker compose down -v`) because the initial migration was replaced
- [x] 12.3 Flip R0 row in `docs/plan/index.md` status table from `planned` to `done` once demo script passes
- [x] 12.4 Update `openspec/project.md` if any stack or architectural decisions changed materially

## 13. Verify against acceptance criteria

- [x] 13.1 `docker compose down -v && docker compose up` from a fresh clone boots the stack with no manual steps
- [x] 13.2 Two browsers: register A and B; A creates public room `general`; B joins from catalog search; A sends text → B sees it live within 3 s; B's sidebar badge clears on room open
- [x] 13.3 A opens DM with B by username, sends a message; B sees it live and gets DM unread badge
- [x] 13.4 A closes all windows → B sees A's dot turn offline within 2 s; A reopens → still signed in → dot turns online
- [x] 13.5 B scrolls up past initial page → older messages load; incoming messages surface via "new messages" pill without forcing scroll
- [x] 13.6 A signs out in browser 1 → browser 2 for the same user stays signed in
- [x] 13.7 Owner `POST /api/rooms/:id/leave` returns a 4xx; non-owner leave returns 2xx

`pnpm test:e2e` (with stack up) covers 13.2–13.7 in `e2e/r0-acceptance.spec.ts`.
- [x] 13.8 `openspec validate r0-mvp --strict` passes
