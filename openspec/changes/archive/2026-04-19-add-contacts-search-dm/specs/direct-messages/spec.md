## ADDED Requirements

### Requirement: Sidebar New DM dialog uses a contact picker

The sidebar "+ New DM" dialog SHALL present a searchable list of the caller's accepted friends instead of a free-text username field. Activating a contact SHALL call `POST /api/dm/:username` for that friend's username and navigate to the resulting `/dm/:conversationId`.

#### Scenario: Picking a contact opens their DM

- **WHEN** the user opens the sidebar "+ New DM" dialog and clicks friend `bob`
- **THEN** the client calls `POST /api/dm/bob`
- **AND** the dialog closes and the app navigates to `/dm/:conversationId` with the returned id

#### Scenario: Search filters the contact picker

- **WHEN** the dialog is open and the user types `ali` into the picker's search box
- **THEN** only friends whose username contains `ali` (case-insensitive) are listed

#### Scenario: Empty friends list shows a helpful empty state

- **WHEN** the user opens the "+ New DM" dialog and has zero accepted friends
- **THEN** the dialog renders a short message stating no contacts are available yet
- **AND** renders a link to `/contacts` so the user can invite someone
- **AND** the dialog does NOT render a free-text username input
