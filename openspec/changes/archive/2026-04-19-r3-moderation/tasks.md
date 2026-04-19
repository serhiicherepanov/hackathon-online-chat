## 1. Data model and authorization foundations

- [x] 1.1 Extend `prisma/schema.prisma` with `RoomInvite`, `RoomBan`, and any required `RoomMember.role` enum/index updates for owner/admin/member moderation
- [x] 1.2 Add and verify the Prisma migration for room invites, bans, and moderation-related uniqueness constraints
- [x] 1.3 Add shared room-authorization helpers for owner/admin/member checks, active-ban checks, and invite eligibility

## 2. Room moderation and settings APIs

- [x] 2.1 Implement `PATCH /api/rooms/:id` for owner-only room metadata updates (name, description, visibility)
- [x] 2.2 Implement admin grant/revoke endpoints for room members with owner-protection rules
- [x] 2.3 Implement ban, unban, and member-removal endpoints with transactional membership revocation
- [x] 2.4 Update public-room join logic so active room bans reject rejoin attempts

## 3. Invitation flow

- [x] 3.1 Implement `POST /api/rooms/:id/invites` for private-room invites by username with duplicate/member/ban validation
- [x] 3.2 Implement `POST /api/invites/:id/accept` and `POST /api/invites/:id/decline` with invitee-only authorization and room/banned-state rechecks
- [x] 3.3 Add serializers/loaders for pending invite inbox data and room summaries returned on accept

## 4. Message and attachment moderation rules

- [x] 4.1 Extend `DELETE /api/messages/:id` so room admins and owners can soft-delete other users' room messages while DMs remain author-only
- [x] 4.2 Update attachment download authorization so banned/removed room users lose access immediately and room-deleted files return `404`
- [x] 4.3 Ensure room deletion cascades through moderation rows and attachment-file cleanup semantics

## 5. Realtime moderation events

- [x] 5.1 Extend realtime payload types and publish helpers for `room.invited`, `room.access.revoked`, `room.deleted`, `member.banned`, and `role.changed`
- [x] 5.2 Publish moderation and invitation events only after the corresponding DB transactions commit
- [x] 5.3 Add best-effort Centrifugo unsubscribe/revocation handling for banned or removed users
- [x] 5.4 Update the client realtime layer to consume the new room moderation events and invalidate or patch relevant caches

## 6. Room management UI

- [x] 6.1 Add room-header actions for `Invite user`, `Manage room`, `Leave`, and owner-only destructive controls
- [x] 6.2 Implement the `Manage Room` dialog with Members, Admins, Banned, Invitations, and Settings tabs wired to the new APIs
- [x] 6.3 Add the private-room invite inbox UI and accept/decline flows for invitees
- [x] 6.4 Handle live access revocation in the shell by showing a toast, removing the room from the sidebar, and routing away from revoked/deleted rooms

## 7. Tests and release docs

- [x] 7.1 Add Vitest coverage for room role checks, invite acceptance rules, ban-aware join/access checks, and moderator message deletion authorization
- [x] 7.2 Add end-to-end coverage for invite acceptance, admin promotion, room ban/revocation, admin message deletion, and owner room deletion cleanup
- [x] 7.3 Run `pnpm typecheck` and `pnpm test` with the required timeout/logging wrapper after implementation lands
- [x] 7.4 Update `ROADMAP.md`, release docs, and `README.md` if the moderation/admin flows add or change reviewer-visible behavior
