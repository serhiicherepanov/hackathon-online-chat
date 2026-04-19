## MODIFIED Requirements

### Requirement: App shell layout

The authenticated app SHALL render within a persistent shell that contains a top navigation bar, a **left-hand** navigation sidebar with **three** accordion sections in this **vertical order** (top to bottom): **Invites** (pending private-room invites inbox), **Direct messages** (DM conversations), and **Rooms** (memberships), and the main pane for the active route's content. On larger breakpoints, the navigation sidebar SHALL remain visible as part of the shell. On small screens, the navigation sidebar SHALL be hidden by default and exposed through a burger-menu trigger that opens the same navigation content in a dismissible drawer or sheet. The small-screen top bar SHALL hide the logo/app-name treatment to prioritize the menu trigger and conversation context, and the current-user identity/actions SHALL move out of the mobile top bar into the right-side shell details area.

Sidebar accordion sections SHALL use a disclosure indicator where a **collapsed** section shows a **chevron pointing right** and an **expanded** section shows a **chevron pointing down**. The collapsed state SHALL NOT use an upward-pointing chevron as the only collapsed affordance.

The **Direct messages** section header SHALL include a **compact** control adjacent to the section title that starts a new DM using the same contact-picker dialog and post-select navigation as required for "+ New DM" in the direct-messages capability.

The **Rooms** section header SHALL include **compact** controls adjacent to the section title to open the **public room catalog** (browse/search/join) and to **create a room**, preserving the same behaviors as the entry points on the `/rooms` catalog (modal, navigation, or equivalent).

Each row in the **Direct messages** list SHALL show the peer's **avatar** (image when available, otherwise a stable fallback such as initials) and **presence status** (`online`, `afk`, or `offline`) consistent with the presence capability.

#### Scenario: Sign-out from the current-user controls

- **WHEN** a signed-in user clicks `Sign out` from the shell's current-user controls
- **THEN** the client calls `POST /api/auth/sign-out`
- **AND** navigates to `/sign-in`
- **AND** any other open tab for the same user that is still holding a valid session cookie continues to work

#### Scenario: Sidebar lists invites, rooms, and DMs for the current user

- **WHEN** the app shell mounts
- **THEN** the sidebar loads pending invites via `GET /api/me/invites` (or equivalent wired data source), `GET /api/me/rooms`, and `GET /api/me/dm-contacts` via TanStack Query
- **AND** renders the Invites, Direct messages, and Rooms sections in that order
- **AND** renders each room and DM contact as a link or navigation target with an unread badge when unread > 0

#### Scenario: Mobile header shows a burger trigger instead of the logo

- **WHEN** the authenticated shell renders on a small-screen viewport
- **THEN** the top bar shows a burger-menu trigger for navigation
- **AND** the logo/app-name treatment is hidden from that mobile header

#### Scenario: Burger trigger opens the navigation drawer on mobile

- **WHEN** the user taps the burger-menu trigger on a small-screen viewport
- **THEN** the shell opens a drawer or sheet containing the same Invites, Direct messages, and Rooms navigation content used on desktop
- **AND** selecting a destination from that drawer navigates to the chosen route
- **AND** the drawer closes after navigation completes

#### Scenario: Current-user identity moves to the right-side details area on mobile

- **WHEN** the authenticated shell renders on a small-screen viewport
- **THEN** the current-user identity/actions are available in the right-side shell details area
- **AND** the mobile top bar does not render that user identity block

#### Scenario: Collapsed accordion shows a right-pointing chevron

- **WHEN** a sidebar accordion section is collapsed
- **THEN** its disclosure control shows a right-pointing chevron (or equivalent) and does not show only an upward-pointing chevron as the collapsed affordance

#### Scenario: Expanded accordion shows a down-pointing chevron

- **WHEN** a sidebar accordion section is expanded
- **THEN** its disclosure control shows a down-pointing chevron (or equivalent)
