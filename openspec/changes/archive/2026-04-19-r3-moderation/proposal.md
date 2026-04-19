## Why

R2 makes the chat socially aware, but room governance is still too thin for private communities and moderator workflows. R3 closes that gap by adding invitations, roles, bans, and the full manage-room surface so private rooms can be administered safely without leaving the classic chat experience.

## What Changes

- Add room moderation primitives: `owner`, `admin`, and `member` roles with server-enforced permissions.
- Add private-room invitations so owners and admins can invite users into rooms without exposing those rooms in the public catalog.
- Add room bans and member removal flows, including live access revocation and ban-aware attachment access checks.
- Add the full Manage Room UI for membership, admins, bans, invitations, and owner-only room settings.
- Extend message moderation so admins can delete other users' room messages, while owners retain destructive room-level controls such as room deletion.

## Capabilities

### New Capabilities
- `room-moderation`: Room roles, bans, removals, private-room invitations, and ownership/admin enforcement.

### Modified Capabilities
- `rooms`: Change room management requirements to include role-aware membership, owner-editable settings, private-room invitation entry, and room deletion/admin flows in the UI and API.
- `messages`: Change room message moderation rules so admins can delete messages authored by other users in the same room.
- `attachments`: Change room attachment access rules so banned or removed users immediately lose access, while deleted rooms fully remove their files from disk.
- `realtime`: Extend room and user event contracts for invites, role changes, bans, access revocation, and room deletion fan-out.
- `chat-ui`: Add the Manage Room dialog, invite entry points, room moderation actions, and live revoked-access handling in the shell.

## Impact

- Affected areas include the Prisma schema, room membership and invitation APIs, attachment authorization, Centrifugo publish/unsubscribe flows, and the room-management UI.
- Adds new room-level moderation endpoints and realtime payloads on `room:{id}` and `user:{id}` channels for invitations, revocations, role changes, and room deletion.
- Requires updated tests and release docs to cover invite acceptance, admin promotion/demotion, banning, cross-user message deletion, room deletion, and attachment cleanup semantics.
