# R3 — Moderation & Admin

Goal: full room governance — owner/admin roles, bans, private-room invitations,
and the complete Manage Room modal from the wireframes. Private rooms were
already hidden from the catalog in R0; R3 delivers the invitation flow and
per-role enforcement.

Builds on [R2](r2-social-presence.md).

## Scope (in)

- Roles: owner (one per room, immutable admin), admin (many), member.
- Admin actions: delete any message in the room, remove a member (= ban), ban/unban, view ban list with banned-by metadata, grant/revoke admin (cannot demote owner).
- Owner-only: change room settings (name/description/visibility), remove any admin, delete room (already implemented in R0 for owner alone; now wired to UI). Deleting a room cascades Postgres rows and unlinks attachment files from disk.
- Private-room invitations: by username; recipient sees pending invite in inbox; accept / decline.
- Room ban semantics: removed user loses access, cannot rejoin until unbanned; on-disk files remain unless the room itself is deleted.
- Live access revocation: banned user's sidebar room disappears within a second; their open message view shows a toast and routes them away.

## Data model additions

- `RoomMember.role` values extended: `owner` | `admin` | `member`
- `RoomBan` — roomId, userId, bannedById, createdAt; unique(roomId, userId)
- `RoomInvite` — roomId, inviteeId, inviterId, status (`pending` | `accepted` | `declined`), createdAt

## API additions

- `PATCH /api/rooms/:id` — owner-only: name, description, visibility
- `POST /api/rooms/:id/admins/:userId`, `DELETE /api/rooms/:id/admins/:userId`
- `POST /api/rooms/:id/bans/:userId`, `DELETE /api/rooms/:id/bans/:userId`
- `DELETE /api/rooms/:id/members/:userId` — admin remove (creates ban row)
- `POST /api/rooms/:id/invites` `{ username }`, `POST /api/invites/:id/accept|decline`
- `DELETE /api/messages/:id` — admin path (alongside author path from R1)

## Realtime additions

- `user:{userId}` — `room.invited`, `room.access.revoked`, `room.deleted`
- `room:{roomId}` — `member.joined`, `member.left`, `member.banned`, `role.changed`, `room.updated`, `room.deleted`
- Revocation: server calls Centrifugo unsubscribe API for the affected user+channel and publishes `room.access.revoked` on their user channel.

## UI additions

- `ManageRoomDialog` tabs (modal, wireframe-accurate): Members, Admins, Banned, Invitations, Settings.
- Room header menu: Invite user, Manage room, Leave (owner sees Delete room instead of Leave).
- Toast + sidebar removal on `room.access.revoked`.

## Acceptance criteria

1. Owner opens Manage Room → Members tab lists roles and statuses; can make/remove admin; cannot demote owner (UI + API).
2. Admin bans a member → the member's room disappears from their sidebar live; rejoin via catalog is rejected; ban list shows banned-by and timestamp.
3. Admin deletes someone else's message → live removal for all participants.
4. Owner invites a user by username to a private room → invitee sees pending invite, accepts, joins.
5. Owner deletes the room → all members see it disappear; messages and on-disk attachments are removed; DB is clean.
6. Ex-member requesting `GET /api/files/:id` for a deleted room receives 404; for a room they were only banned from, 403.
