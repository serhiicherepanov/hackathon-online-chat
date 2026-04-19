## MODIFIED Requirements

### Requirement: Manage Room dialog and room moderation actions

The room header UI SHALL expose moderation entry points appropriate to the current user's role. Owners and admins SHALL be able to open a `Manage Room` dialog with room governance tabs. In the members management surface, moderators SHALL have separate `Remove` and `Ban` actions with distinct confirmation copy describing each outcome, while owners SHALL additionally see owner-only settings and delete-room actions.

#### Scenario: Owner opens Manage Room

- **WHEN** the owner opens the room header menu in `/rooms/[id]`
- **THEN** the menu includes `Invite user` and `Manage room`
- **AND** opening `Manage room` shows tabs for Members, Admins, Banned, Invitations, and Settings

#### Scenario: Admin sees moderation tabs but not owner-only settings

- **WHEN** a room admin opens `Manage room`
- **THEN** the dialog shows member, admin, ban, and invitation management controls
- **AND** owner-only settings such as room metadata editing and room deletion are hidden or disabled

#### Scenario: Moderator chooses remove vs ban from members list

- **WHEN** an owner or admin opens member actions in Manage Room
- **THEN** the UI offers separate `Remove` and `Ban` actions
- **AND** confirming `Remove` calls `DELETE /api/rooms/:id/members/:userId` and refreshes member/banned lists
- **AND** confirming `Ban` calls `POST /api/rooms/:id/bans/:userId` and refreshes member/banned lists
- **AND** each confirmation dialog explains whether the user can rejoin without an unban

#### Scenario: Member cannot access moderation UI

- **WHEN** a regular room member opens the room header menu
- **THEN** the menu does not show moderation actions
