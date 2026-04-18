## 1. Data model and migrations

- [x] 1.1 Extend `prisma/schema.prisma` with friendship, block, and presence state models/enums plus the required pairwise indexes and uniqueness constraints
- [x] 1.2 Add and run a Prisma migration for the new social graph and presence tables; verify the generated SQL matches the sorted-pair and directional-block invariants
- [x] 1.3 Update seed or fixture data so local/dev flows can exercise pending friendship, accepted friendship, blocked pairs, and persisted AFK state

## 2. Social graph server helpers

- [x] 2.1 Add shared helpers for sorted friendship pair keys, friendship lookup, and active-block checks that can be reused by contacts, DM creation, and message send authorization
- [x] 2.2 Add a DM frozen-state helper that derives read-only status from the current block rows for a DM pair
- [x] 2.3 Add serializers for contacts payloads and user-scoped social realtime events

## 3. Friends and blocks APIs

- [x] 3.1 Implement `GET /api/friends` to return accepted friends, inbound pending requests, outbound pending requests, and blocked users
- [x] 3.2 Implement `POST /api/friends/requests` with validation for self-request, duplicate request, accepted friendship, and blocked-pair rejection
- [x] 3.3 Implement `POST /api/friends/requests/:id/accept` and `POST /api/friends/requests/:id/decline` with recipient-only authorization
- [x] 3.4 Implement `DELETE /api/friends/:userId` to remove an accepted friendship for either participant
- [x] 3.5 Implement `POST /api/blocks` and `DELETE /api/blocks/:userId` with idempotent behavior and friendship teardown on block

## 4. Direct-message rule enforcement

- [x] 4.1 Update `POST /api/dm/:username` so new DM creation requires accepted friendship and no active block, while existing DMs are still reused
- [x] 4.2 Update DM-related loaders/serializers to expose frozen state where the client needs to render a read-only banner
- [x] 4.3 Update `POST /api/conversations/:id/messages` so blocked DM conversations reject new sends with `403` and do not publish realtime events

## 5. Presence v2 backend

- [x] 5.1 Replace the binary presence payload shape with `online` / `afk` / `offline` statuses in the shared types and serializers
- [x] 5.2 Add server-side presence aggregation that combines Centrifugo connection count with persisted `lastActiveAt` to compute aggregate state
- [x] 5.3 Implement an authenticated heartbeat/update endpoint for user activity and wire it to publish `presence.changed` only on real state transitions
- [x] 5.4 Update `GET /api/presence` and reconcile flows to return the richer status model and keep the DB mirror in sync on reconnect/disconnect

## 6. Realtime contracts and typing events

- [x] 6.1 Extend `lib/realtime/payloads.ts` and publish helpers for social events (`friend.request`, `friend.accepted`, `friend.removed`, `block.created`, `block.removed`, `dm.frozen`) and richer `presence.changed`
- [x] 6.2 Publish user-scoped social events only after the corresponding friendship/block transaction commits
- [x] 6.3 Add a server entrypoint for typing events with membership/frozen-DM authorization and a typed `typing` payload contract
- [x] 6.4 Update the Centrifugo client/provider to parse and fan out the new presence, social, frozen-DM, and typing events into the appropriate client stores/query caches

## 7. Client state and hooks

- [x] 7.1 Add TanStack Query hooks for contacts, friend-request mutations, friendship removal, and block/unblock actions
- [x] 7.2 Upgrade the presence store and any dependent hooks/components from boolean `online` state to enum-style aggregate presence state
- [x] 7.3 Add a client typing store with per-conversation expiry timers and helpers to merge incoming typing events
- [x] 7.4 Add a DM frozen-state store or query integration so the composer and conversation view can react immediately to block changes

## 8. UI surfaces

- [x] 8.1 Add `/(app)/contacts` with accepted friends, pending requests, blocked users, and the request/accept/decline/remove/block actions
- [x] 8.2 Upgrade presence indicators in room member lists, DM list items, and contacts entries to render online/afk/offline states
- [x] 8.3 Add block/unblock affordances on user surfaces that already expose peer actions (contacts, member lists, DM header)
- [x] 8.4 Add a frozen-DM banner and read-only composer state for blocked direct messages
- [x] 8.5 Add typing-indicator UI for room and DM conversations, including composer-side publish throttling and subscriber-side expiry

## 9. Tests and docs

- [x] 9.1 Add Vitest coverage for sorted friendship pairs, block checks, DM frozen-state derivation, and presence aggregation transitions
- [x] 9.2 Add Vitest coverage for the upgraded presence store and typing store expiry behavior
- [x] 9.3 Add end-to-end coverage for friend request -> accept, block -> frozen DM, multi-tab AFK/offline transitions, and room/DM typing visibility
- [x] 9.4 Run `pnpm typecheck` and `pnpm test` with the required timeout/logging wrapper after the implementation lands
- [x] 9.5 Update `README.md`, `.env.example`, and release status/docs for the new social and presence behavior if any new vars or setup steps are introduced
