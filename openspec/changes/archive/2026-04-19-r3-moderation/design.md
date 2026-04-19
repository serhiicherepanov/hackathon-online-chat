## Context

R2 already delivers rooms, attachments, social gating, richer presence, and realtime updates, but room governance is still limited to a single owner-only delete endpoint plus basic membership. R3 needs to introduce moderation without breaking the current REST-plus-Centrifugo split, the existing room sidebar/query model, or the attachment access guarantees that were added in R1.

This change touches multiple layers at once: Prisma data modeling, role-aware authorization helpers, room and message APIs, Centrifugo event payloads, and the shell UI for managing a room. It also changes access semantics after a user loses room membership, which means attachment downloads, active subscriptions, and open conversation views must all react consistently.

## Goals / Non-Goals

**Goals:**
- Add room-scoped governance with `owner`, `admin`, and `member` roles.
- Support private-room invitations, room bans, and moderator-driven removal flows with durable server state.
- Ensure access revocation is consistent across REST, realtime subscriptions, sidebar data, and file downloads.
- Surface management actions in a dedicated Manage Room UI instead of hidden one-off controls.
- Extend message deletion so room admins can moderate other users' messages.

**Non-Goals:**
- No cross-room/global moderation system.
- No email-based invitations or external invite links in this release.
- No changes to DM moderation or friendship rules.
- No new infrastructure service; this stays within Next.js, Postgres, local files, and Centrifugo.

## Decisions

### 1. Model moderation as room-scoped tables plus explicit role values

`RoomMember.role` remains the single source of truth for active membership, extended to `owner | admin | member`. Two new tables capture state that outlives an active membership:
- `RoomInvite(roomId, inviteeId, inviterId, status, createdAt, respondedAt?)`
- `RoomBan(roomId, userId, bannedById, createdAt)`

This keeps queries simple:
- "Can this user access room X?" checks membership first, then ban state for joins/invites.
- "What should the Manage Room dialog show?" reads current members, pending invites, and bans independently.

Alternatives considered:
- Reusing `RoomMember` with soft-delete flags for bans/removals would blur active membership and historical moderation state.
- Encoding invites in a generic notifications table would make acceptance flows and uniqueness constraints harder.

### 2. Keep invitation delivery user-scoped, acceptance room-scoped

Creating an invite writes a `RoomInvite` row and publishes `room.invited` on `user:{inviteeId}`. Accept/decline endpoints mutate the invite row and, on accept, create a `RoomMember` row in the same transaction after re-checking:
- the room still exists,
- the invite is still pending,
- the invitee is not already a member,
- no active `RoomBan` exists.

This design lets the invite inbox live outside the room page while keeping authorization and membership changes in room-centric code.

Alternatives considered:
- Auto-joining on invite creation would remove user consent and make accidental invites destructive.
- Invitation tokens/links are unnecessary because all invitees are already registered users.

### 3. Treat moderator removal as ban creation, not a separate transient kick

`DELETE /api/rooms/:id/members/:userId` creates or preserves a `RoomBan` row and removes the member row in one transaction. A separate unban endpoint deletes the `RoomBan` row; rejoining then follows normal public/private rules.

This matches the release requirement that removed users cannot rejoin until unbanned and avoids edge cases where a "kick" silently becomes a no-op after reconnect.

Alternatives considered:
- A separate `kicked` state would add another access mode with little product value for R3.

### 4. Enforce revocation immediately in both REST and realtime

After any ban/removal/room deletion:
- subsequent REST checks fail because membership is gone or the room is gone,
- the server publishes a user-scoped revocation event (`room.access.revoked` or `room.deleted`),
- the client removes the room from cached/sidebar data and routes away from an open revoked room,
- the server best-effort unsubscribes the affected user from `room:{conversationId}` via Centrifugo's server API.

The unsubscribe call is best-effort because database state is authoritative; if unsubscribe fails, the subscribe proxy and REST checks still prevent continued use.

Alternatives considered:
- Relying on the client alone to stop listening would be too weak for moderation.
- Hard-failing the mutation when unsubscribe fails would make moderation dependent on transient realtime outages.

### 5. Keep attachment cleanup transactional at the DB layer and asynchronous on disk

Room deletion already owns the hard-delete path. R3 extends it so attachment rows for the room are enumerated inside the delete transaction, then their files are unlinked immediately after commit with error logging and retry-safe idempotence. Bans and removals do not delete files; they only change access checks.

This preserves the existing rule that files remain while the room exists, but are fully removed when the room is deleted.

Alternatives considered:
- Deleting files inside the transaction is unsafe because the filesystem cannot roll back.
- Leaving room-deleted files on disk would violate the release acceptance and submission expectations.

### 6. Reuse the existing message delete contract, but broaden authorization for room admins

`DELETE /api/messages/:id` stays soft-delete and keeps the same event contract. The only behavioral expansion is that a room admin or owner may delete another user's room message, while DM deletion remains author-only.

This minimizes client churn because `message.deleted` already exists and only the available action set changes.

Alternatives considered:
- Adding a separate moderator-delete endpoint would duplicate most of the logic and UI handling.

## Risks / Trade-offs

- Revocation races with open clients -> Mitigation: enforce membership checks on every REST read/write and use best-effort unsubscribe plus a user-scoped revoke event.
- Room deletion can leave orphaned files if unlinking partially fails -> Mitigation: collect file paths before delete, unlink after commit, log failures, and make cleanup retry-safe.
- Role-heavy UI can sprawl -> Mitigation: centralize actions in a Manage Room dialog with tabbed sections instead of scattering controls across the room page.
- Invite and ban tables can accumulate stale rows -> Mitigation: enforce uniqueness and only retain states needed for product behavior (`pending/accepted/declined` invites, active bans).

## Migration Plan

1. Add Prisma schema changes for `RoomInvite`, `RoomBan`, and any supporting indexes/enum updates.
2. Regenerate Prisma client and update authorization helpers to understand room roles and ban checks.
3. Implement room moderation and invite APIs, then extend attachment/message authorization.
4. Publish and consume the new Centrifugo events for invites, role changes, revocations, and room deletion.
5. Add the Manage Room and invite UI flows.
6. Update unit/e2e coverage for invite acceptance, bans, admin message deletion, and room deletion cleanup.

Rollback strategy:
- The migration is additive except for stricter authorization; rollback means reverting the app code and, if needed, leaving the new tables unused until a follow-up migration removes them.

## Open Questions

- Whether invite history needs to remain visible after accept/decline, or only pending invites need UI exposure.
- Whether public-room admins may invite users directly, or invite actions should remain private-room-only in the first cut.
- Whether ownership transfer belongs in the initial R3 slice or should remain a follow-up under the same release branch.
