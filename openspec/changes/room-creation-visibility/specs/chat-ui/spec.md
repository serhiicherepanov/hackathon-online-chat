## MODIFIED Requirements

### Requirement: Public room catalog page

The app SHALL provide a `/rooms` page that lists public rooms from `GET /api/rooms`, with a search input and a "Create room" button that opens a modal. The create-room modal SHALL include a visible control that lets the user choose room **visibility** as **public** or **private** before submit, with **public** as the default. The modal title and helper copy SHALL NOT imply that only public rooms can be created.

#### Scenario: Search filters the catalog

- **WHEN** the user types into the search input on `/rooms`
- **THEN** the list refetches with the debounced search term and re-renders without a full page reload

#### Scenario: Join button transitions to membership

- **WHEN** the user clicks "Join" on a catalog row
- **THEN** the client calls `POST /api/rooms/:id/join`
- **AND** on success the row's button becomes "Open" and the sidebar gains the new room entry

#### Scenario: Create-room modal sends chosen visibility

- **WHEN** the user sets visibility to `private` (or leaves the default `public`) and submits the create-room modal with a valid unique name
- **THEN** the client calls `POST /api/rooms` with a JSON body whose `visibility` matches the selection
- **AND** on success navigates to `/rooms/<id>` and closes the modal

#### Scenario: Create-room modal creates and opens

- **WHEN** the user submits the create-room modal with a valid unique name and a chosen visibility
- **THEN** the client calls `POST /api/rooms`
- **AND** on success navigates to `/rooms/<id>` and closes the modal
