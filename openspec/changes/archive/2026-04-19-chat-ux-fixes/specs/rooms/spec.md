## ADDED Requirements

### Requirement: Room member rows expose identity and friend actions
The room members panel SHALL expose convenient actions for visible users without leaving the room. Each rendered member row SHALL make the surfaced `userId` copyable by click with immediate success feedback, and SHALL offer an "Add friend" action for visible users who are not the caller and do not already have an accepted or pending friendship relationship with the caller.

#### Scenario: Clicking a visible user id copies it
- **WHEN** the user clicks the rendered `userId` for a member row in the room members panel
- **THEN** the client copies that `userId` to the clipboard
- **AND** the UI shows immediate confirmation that the copy succeeded

#### Scenario: Add friend is available for an unrelated room member
- **WHEN** the caller views a member row for another visible user who is neither already a friend nor part of a pending friend request with the caller
- **THEN** the row renders an "Add friend" action
- **AND** activating it calls `POST /api/friends/requests` for that target user and updates the row to reflect the pending state without leaving the room

#### Scenario: Friend action is hidden when it is not applicable
- **WHEN** the member row belongs to the caller, an existing friend, or a user with an already-pending request in either direction
- **THEN** the room members panel does not render the "Add friend" action for that row
