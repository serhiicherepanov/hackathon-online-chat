## ADDED Requirements

### Requirement: Manage Room dialog and room moderation actions
The room header UI SHALL expose moderation entry points appropriate to the current user's role. Owners and admins SHALL be able to open a `Manage Room` dialog with room governance tabs, while owners SHALL additionally see owner-only settings and delete-room actions.

#### Scenario: Owner opens Manage Room
- **WHEN** the owner opens the room header menu in `/rooms/[id]`
- **THEN** the menu includes `Invite user` and `Manage room`
- **AND** opening `Manage room` shows tabs for Members, Admins, Banned, Invitations, and Settings

#### Scenario: Admin sees moderation tabs but not owner-only settings
- **WHEN** a room admin opens `Manage room`
- **THEN** the dialog shows member, admin, ban, and invitation management controls
- **AND** owner-only settings such as room metadata editing and room deletion are hidden or disabled

#### Scenario: Member cannot access moderation UI
- **WHEN** a regular room member opens the room header menu
- **THEN** the menu does not show moderation actions

### Requirement: Private-room invite inbox and acceptance flow
The app SHALL surface pending private-room invites to the invitee and let them accept or decline without manually entering a room id or username.

#### Scenario: Invitee sees pending invite
- **WHEN** the client receives `room.invited` on `user:{currentUserId}`
- **THEN** the UI adds the invite to the user's invite inbox with the room name and inviter identity

#### Scenario: Accepting an invite joins and opens the room
- **WHEN** the invitee accepts a pending invite from the UI
- **THEN** the client calls `POST /api/invites/:id/accept`
- **AND** on success updates the sidebar membership list and navigates to `/rooms/[id]`

### Requirement: Revoked room access is handled live
The app SHALL react immediately when the current user loses room access because of a ban, removal, or room deletion.

#### Scenario: User is banned from an open room
- **WHEN** the client receives `room.access.revoked` for the room currently open in the main pane
- **THEN** the UI shows a toast explaining that access was removed
- **AND** removes the room from the sidebar
- **AND** routes the user away from the revoked room view

#### Scenario: Room is deleted while listed in the sidebar
- **WHEN** the client receives `room.deleted` for a room present in cached room lists
- **THEN** the room disappears from the sidebar and any matching open room view closes without a full-page reload
