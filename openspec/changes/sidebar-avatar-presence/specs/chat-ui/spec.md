## MODIFIED Requirements

### Requirement: App shell layout

The authenticated app SHALL render within a persistent shell that contains a top navigation bar (app name + current user menu with sign-out) and a right-hand sidebar with **three** accordion sections in this **vertical order** (top to bottom): **Invites** (pending private-room invites inbox), **Direct messages** (DM conversations), and **Rooms** (memberships). The main pane renders the active route's content.

Sidebar accordion sections SHALL use a disclosure indicator where a **collapsed** section shows a **chevron pointing right** and an **expanded** section shows a **chevron pointing down**. The collapsed state SHALL NOT use an upward-pointing chevron as the only collapsed affordance.

The **Direct messages** section header SHALL include a **compact** control adjacent to the section title that starts a new DM using the same contact-picker dialog and post-select navigation as required for "+ New DM" in the direct-messages capability.

The **Rooms** section header SHALL include **compact** controls adjacent to the section title to open the **public room catalog** (browse/search/join) and to **create a room**, preserving the same behaviors as the entry points on the `/rooms` catalog (modal, navigation, or equivalent).

Each row in the **Direct messages** list SHALL show the peer's avatar using the shared avatar treatment: render the stored user avatar image when available, otherwise render the same deterministic generated fallback used for that user in conversation and contacts surfaces. The row SHALL display the peer's presence status (`online`, `afk`, or `offline`) as a badge anchored to the avatar's bottom-right corner.

Each row in the **Rooms** list SHALL show a deterministic abstract room avatar generated from stable room identity data so the same room renders the same avatar across reloads and sessions.

#### Scenario: Sign-out from the user menu

- **WHEN** a signed-in user clicks "Sign out" in the top-nav user menu
- **THEN** the client calls `POST /api/auth/sign-out`
- **AND** navigates to `/sign-in`
- **AND** any other open tab for the same user that is still holding a valid session cookie continues to work

#### Scenario: Sidebar lists invites, rooms, and DMs for the current user

- **WHEN** the app shell mounts
- **THEN** the sidebar loads pending invites via `GET /api/me/invites` (or equivalent wired data source), `GET /api/me/rooms`, and `GET /api/me/dm-contacts` via TanStack Query
- **AND** renders the Invites, Direct messages, and Rooms sections in that order
- **AND** renders each room and DM contact as a link or navigation target with an unread badge when unread > 0

#### Scenario: DM peer row reuses the shared user avatar

- **WHEN** the same user appears in the sidebar DM list and in an open conversation view
- **THEN** both surfaces render the same deterministic fallback avatar for that user when no uploaded avatar is present
- **AND** the DM row preserves the uploaded avatar image when `avatarUrl` is available

#### Scenario: Room row shows a deterministic abstract avatar

- **WHEN** the sidebar renders a room membership row
- **THEN** the row includes an abstract generated avatar for that room
- **AND** the same room renders the same avatar again after the shell reloads

#### Scenario: Collapsed accordion shows a right-pointing chevron

- **WHEN** a sidebar accordion section is collapsed
- **THEN** its disclosure control shows a right-pointing chevron (or equivalent) and does not show only an upward-pointing chevron as the collapsed affordance

#### Scenario: Expanded accordion shows a down-pointing chevron

- **WHEN** a sidebar accordion section is expanded
- **THEN** its disclosure control shows a down-pointing chevron (or equivalent)

### Requirement: Message authors are visually identifiable

The conversation view SHALL make message authors easy to scan by rendering a deterministic avatar next to each message and by using stronger visual contrast for the displayed username than the surrounding secondary metadata. Avatar rendering SHALL use the same shared fallback-generation rules as other user surfaces in the app so a user without an uploaded avatar keeps one consistent generated identity across conversation rows, DM rows, contacts rows, and room members rows.

#### Scenario: Message row shows a deterministic avatar

- **WHEN** a message row is rendered for a given author
- **THEN** it includes an avatar generated from stable author identity data
- **AND** the same author renders the same avatar again after the conversation reloads

#### Scenario: Conversation avatar matches other user surfaces

- **WHEN** a user without an uploaded avatar is shown in a conversation row and in another signed-in app surface that renders their identity
- **THEN** both surfaces render the same generated avatar for that user
- **AND** the shared avatar does not drift between reloads

#### Scenario: Username is more prominent than metadata

- **WHEN** a message row renders the author username together with timestamp or edited-state metadata
- **THEN** the username uses stronger contrast than the surrounding secondary metadata
- **AND** the author label remains easy to distinguish while scanning a busy message thread
