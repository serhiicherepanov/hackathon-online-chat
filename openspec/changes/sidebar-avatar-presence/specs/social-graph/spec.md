## ADDED Requirements

### Requirement: Accepted friend rows use the shared avatar and presence badge

The contacts page SHALL render each accepted-friend row with the same shared user avatar treatment used elsewhere in the signed-in app: show the stored avatar image when available, otherwise show the deterministic generated fallback for that user. When accepted-friend presence is displayed, it SHALL appear as a compact badge anchored to the avatar's bottom-right corner.

#### Scenario: Friend row uses the same generated avatar as chat surfaces

- **WHEN** an accepted friend without an uploaded avatar is shown on the contacts page and in a conversation or sidebar row
- **THEN** every surface renders the same generated avatar for that friend
- **AND** the generated avatar remains stable after reload

#### Scenario: Friend row preserves uploaded avatar images

- **WHEN** an accepted friend has a non-null stored avatar image
- **THEN** the contacts row renders that uploaded avatar instead of the generated fallback

#### Scenario: Friend row presence badge is avatar-anchored

- **WHEN** the contacts page renders an accepted friend together with their aggregate presence state
- **THEN** the visible status indicator is attached to the avatar's bottom-right corner
- **AND** the row remains visually scannable without relying on a separate detached dot beside the username
