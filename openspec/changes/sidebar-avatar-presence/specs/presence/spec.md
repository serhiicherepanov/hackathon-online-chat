## MODIFIED Requirements

### Requirement: Members panel reflects presence

The members panel of a room SHALL show the current `online` / `afk` / `offline` state for each visible member, seeded from the initial snapshot and updated live from `presence.changed` events on the `presence` channel. When a member row renders an avatar, the visible presence indicator SHALL be a badge anchored to the avatar's bottom-right corner rather than a detached dot beside the username.

#### Scenario: Online badge appears when member becomes active

- **WHEN** a member of the currently open room is `offline`, and then connects and interacts with the app
- **THEN** the badge attached to that member's avatar turns to the "online" style within 2 seconds, without a page reload

#### Scenario: AFK badge appears when member idles

- **WHEN** a visible room member remains connected but becomes `afk`
- **THEN** the members panel updates that member's avatar badge to the AFK style within 2 seconds, without a page reload

#### Scenario: Offline badge appears after final disconnect

- **WHEN** a visible room member closes their last tab and transitions to `offline`
- **THEN** the members panel updates that member's avatar badge to the offline style within a few seconds, without a page reload

### Requirement: Sidebar DM list reflects peer presence

The authenticated shell SHALL display each Direct messages row with the peer user's current aggregate presence (`online`, `afk`, or `offline`) using the same rules as the members panel: seed from `GET /api/presence` for the set of visible DM peer user ids and update from `presence.changed` events on the `presence` channel (and per-user channels as already implemented). The visible state SHALL be rendered as a compact badge anchored to the peer avatar's bottom-right corner.

#### Scenario: DM peer presence updates within the presence budget

- **WHEN** a peer shown in the Direct messages list changes aggregate presence
- **THEN** that row's avatar badge updates within 2 seconds without a full page reload

#### Scenario: Initial presence is seeded for listed peers

- **WHEN** the Direct messages list renders with one or more peers
- **THEN** the client obtains an initial presence snapshot for those peer user ids before relying solely on live events so rows do not remain indefinitely without a status

#### Scenario: DM row badge stays attached to the avatar

- **WHEN** the sidebar renders a DM peer row with presence enabled
- **THEN** the status indicator is visually attached to the avatar's bottom-right corner
- **AND** the row does not rely on a separate detached status dot beside the username as the primary presence affordance
