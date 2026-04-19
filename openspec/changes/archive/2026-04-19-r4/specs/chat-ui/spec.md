## ADDED Requirements

### Requirement: Settings area exposes profile, password, and active-session management
The authenticated app SHALL provide a settings area with routes or views for editable profile fields, password management, and active-session management, using the same signed-in shell and UI conventions as the rest of the product.

#### Scenario: User opens settings screens
- **WHEN** an authenticated user navigates to the R4 settings area
- **THEN** the UI exposes separate surfaces for profile editing, password management, and active sessions
- **AND** each surface fetches and submits through the corresponding authenticated API without leaving the signed-in app shell

### Requirement: Delete-account UX uses typed confirmation and explicit impact copy
The authenticated app SHALL present account deletion as a dangerous action behind an explicit confirmation flow that describes the deletion impact before submitting the destructive request.

#### Scenario: User must confirm destructive account deletion
- **WHEN** an authenticated user chooses the delete-account action
- **THEN** the UI shows a confirmation step that explains the consequences for owned rooms, memberships, sessions, and surviving message history
- **AND** the destructive request is only submitted after the user completes the required confirmation interaction

### Requirement: Polished loading and empty states cover the main reviewer flows
The authenticated app SHALL provide clear loading skeletons or empty states for the primary R4 reviewer surfaces, including sidebar lists, conversation history, and settings pages, so the submission never presents blank or ambiguous UI while data is loading or absent.

#### Scenario: Settings page loads without a blank panel
- **WHEN** a reviewer navigates to a settings page before its data request resolves
- **THEN** the content area renders a loading state rather than an empty blank panel
- **AND** if the backing dataset is empty, the page renders an explanatory empty state instead of missing content
