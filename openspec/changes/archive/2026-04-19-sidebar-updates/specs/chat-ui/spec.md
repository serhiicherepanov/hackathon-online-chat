## MODIFIED Requirements

### Requirement: App shell layout

The authenticated app SHALL render within a persistent shell that contains a top navigation bar (app name + current user menu with sign-out) and a right-hand sidebar with **three** accordion sections in this **vertical order** (top to bottom): **Invites** (pending private-room invites inbox), **Direct messages** (DM conversations), and **Rooms** (memberships). The main pane renders the active route's content.

Sidebar accordion sections SHALL use a disclosure indicator where a **collapsed** section shows a **chevron pointing right** and an **expanded** section shows a **chevron pointing down**. The collapsed state SHALL NOT use an upward-pointing chevron as the only collapsed affordance.

The **Direct messages** section header SHALL include a **compact** control adjacent to the section title that starts a new DM using the same contact-picker dialog and post-select navigation as required for "+ New DM" in the direct-messages capability.

The **Rooms** section header SHALL include **compact** controls adjacent to the section title to open the **public room catalog** (browse/search/join) and to **create a room**, preserving the same behaviors as the entry points on the `/rooms` catalog (modal, navigation, or equivalent).

Each row in the **Direct messages** list SHALL show the peer's **avatar** (image when available, otherwise a stable fallback such as initials) and **presence status** (`online`, `afk`, or `offline`) consistent with the presence capability.

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

#### Scenario: Collapsed accordion shows a right-pointing chevron

- **WHEN** a sidebar accordion section is collapsed
- **THEN** its disclosure control shows a right-pointing chevron (or equivalent) and does not show only an upward-pointing chevron as the collapsed affordance

#### Scenario: Expanded accordion shows a down-pointing chevron

- **WHEN** a sidebar accordion section is expanded
- **THEN** its disclosure control shows a down-pointing chevron (or equivalent)
