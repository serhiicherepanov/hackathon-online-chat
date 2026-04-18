## Context

R0 and R1 already provide authenticated chat, rooms, direct messages, unread counts, and binary online/offline presence backed by Centrifugo connection counts. The current implementation has no social graph, allows any user to open a new DM by username, and treats presence as a per-user boolean held mostly in transient runtime state.

R2 adds three cross-cutting concerns at once:

- relationship state between pairs of users (pending, accepted, blocked);
- richer presence semantics (online, afk, offline) that must stay correct across multiple tabs;
- ephemeral typing state on room and DM channels.

These concerns touch Prisma, REST handlers, realtime payloads, client stores, and shell UI. The design needs to keep the stack aligned with repo rules: PostgreSQL is authoritative, Next.js owns business rules, Centrifugo delivers live events, and the app must stay runnable with the existing Compose topology.

## Goals / Non-Goals

**Goals:**

- Model friendships and blocks in Postgres with pairwise invariants that are easy to query from DM, contacts, and moderation flows.
- Enforce the R2 DM rules: new DMs require friendship and no active block, existing pre-R2 DMs remain grandfathered, and blocked pairs see a frozen read-only DM.
- Upgrade presence to `online` / `afk` / `offline` without introducing a new infrastructure dependency.
- Add throttled typing indicators that feel instant but do not spam the server or client cache.
- Keep cold-load UI correct by exposing REST snapshots for social and presence state, then layering realtime updates on top.

**Non-Goals:**

- Cross-device "active sessions" management, session revocation UI, or idle logout.
- Moderation-only bans and room-level permission changes; those remain R3 work.
- Redis-backed cross-node presence coordination; that stays deferred to R5.
- Voice/video presence or read-receipt expansions beyond the existing unread model.

## Decisions

### 1. Store the social graph as explicit pair tables in Postgres

Use two new tables:

- `Friendship`: sorted pair (`userAId`, `userBId`), `status`, `requestedById`, optional `note`, timestamps.
- `UserBlock`: directional row (`blockerId`, `blockedId`) with a unique pair per direction.

Why:

- Sorted friendship pairs prevent duplicate rows and make "are these users friends?" a single indexed lookup.
- A separate block table keeps block semantics directional at the data level while business logic can still enforce "either direction blocks both directions."
- Existing DMs do not need a new persistence model; frozen state can be derived from the pair's active block rows.

Alternatives considered:

- Two directional friendship rows per pair: rejected because every query would need deduplication and dual-row consistency.
- A single relationship table with many states (`pending`, `accepted`, `blocked`, etc.): rejected because block semantics are directional while friendship is symmetric, which makes one-table invariants harder to express cleanly.

### 2. Keep DM freeze as derived state, not a stored conversation flag

The API and UI will compute DM frozen state by looking up whether either participant currently blocks the other. The conversation row itself remains unchanged.

Why:

- The same DM can move between writable and frozen when block state changes, so persisting a duplicate conversation flag invites drift.
- The pairwise block lookup already exists for creation/send authorization; reusing it keeps the source of truth singular.

Alternatives considered:

- Add `isFrozen` to `Conversation`: rejected because it duplicates block state and complicates unblock behavior.

### 3. Use a user-level presence mirror plus activity heartbeats

Add a `Presence` table keyed by `userId` with the current aggregate state and `lastActiveAt`. The authoritative aggregate is computed by combining:

- Centrifugo connection count on `user:{id}` for online vs offline.
- A throttled client activity heartbeat that updates `lastActiveAt` only when the user is genuinely interacting.

Aggregation rules:

- `offline` when Centrifugo reports zero connected clients.
- `online` when at least one client is connected and `lastActiveAt` is within the AFK window.
- `afk` when at least one client is connected and `lastActiveAt` is older than the AFK window.

Why:

- This matches the repo rule that the client should only emit heartbeats on real interaction and the server should infer AFK/offline from absence.
- It avoids a new cache or queue dependency while still giving a persisted cold-load fallback.
- "Any active tab keeps the user online" falls out naturally: any active tab refreshes the shared `lastActiveAt`.

Alternatives considered:

- Per-tab rows in Postgres: more precise, but unnecessary for the required semantics and higher-write volume.
- In-memory aggregation only: rejected because it is lost on restart and cannot seed the UI on cold load.

### 4. Reuse the existing Centrifugo channel layout and extend payload contracts

Keep the current channel names and add event types rather than introducing new channels:

- `user:{id}` for `friend.request`, `friend.accepted`, `friend.removed`, `block.created`, `block.removed`, `dm.frozen`, and `presence.changed`
- `room:{conversationId}` / `dm:{conversationId}` for `typing`
- `presence` for broadcast `presence.changed`

Why:

- Existing subscribe-proxy authorization already matches identity and conversation membership.
- New event types are additive and keep client subscriptions simple.

Alternatives considered:

- Separate `typing:{conversationId}` channels: rejected because they add subscription churn without improving authorization boundaries.

### 5. Treat typing as ephemeral realtime state with client-side expiry

Typing indicators are never persisted. Clients publish "user is typing" at a throttled cadence while the composer is non-empty and focused; subscribers store it in a short-lived local map that expires entries after 3 seconds.

Why:

- Typing is high-churn, low-value state that does not belong in Postgres.
- Client-side expiry means missed "stop typing" events do not leave stale indicators behind.

Alternatives considered:

- Persist typing rows: rejected as unnecessary write amplification.
- Send explicit start/stop events only: rejected because dropped stop events leave stale UI without an expiry fallback.

### 6. Grandfather pre-R2 DMs by creation time, not by friendship backfill

The existing R0/R1 DM endpoint can continue to resolve previously created conversations even if the pair is not friends. The stricter friendship gate only applies when no DM already exists.

Why:

- This matches the release plan and avoids a disruptive migration that would require inventing friendships for every historical DM pair.
- It keeps the rollout additive: old conversations remain visible; only new DM creation becomes stricter.

Alternatives considered:

- Backfill friendships for every existing DM pair: rejected because it changes user intent and obscures which relationships were explicit vs inherited.

## Risks / Trade-offs

- **Heartbeat under-reporting in backgrounded tabs** -> This is expected and acceptable because AFK is defined by the absence of recent activity, not by guaranteed client pings.
- **Block/unblock event races with message send** -> Enforce block checks inside the message write transaction and publish freeze/unfreeze events only after commit.
- **Cold-load presence may lag by a few seconds after crashes or abrupt disconnects** -> Reconcile on subscribe, reconnect, and explicit client pings; treat the DB row as a fallback mirror, not a perfect audit log.
- **Typing spam from large rooms** -> Throttle client publishes per conversation and ignore self-events and duplicate payloads in the client store.
- **Proposal scope spans many UI surfaces** -> Keep server contracts small and derive most view state from shared hooks/stores rather than bespoke per-page logic.

## Migration Plan

1. Add Prisma enums/models for friendships, blocks, and presence mirror data, plus the supporting indexes.
2. Expose REST endpoints for contacts, friend requests, request actions, and block/unblock.
3. Update DM creation and DM message send authorization to consult the social graph and derived frozen state.
4. Extend realtime payload schemas and publish helpers for social events, presence state transitions, and typing.
5. Add client hooks/stores for contacts, richer presence, frozen DMs, and typing indicators; wire the app shell and conversation views.
6. Run unit tests for reducers/helpers and end-to-end tests for the R2 acceptance flow.

Rollback:

- The migration can be rolled back by removing the new tables and leaving R0/R1 behavior intact, provided no other release depends on the new data.
- Because frozen state is derived, there is no separate conversation flag to unwind.

## Open Questions

- Whether the contacts screen should support searching all users by username in R2 or only sending requests from known room members plus direct username entry.
- Whether unblock should immediately unfreeze an existing grandfathered DM even if the pair is still not friends; the current design assumes yes because the active block is the freeze source.
