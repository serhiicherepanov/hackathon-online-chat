## ADDED Requirements

### Requirement: Sidebar DM list reflects peer presence

The authenticated shell SHALL display each Direct messages row with the peer user's current aggregate presence (`online`, `afk`, or `offline`) using the same rules as the members panel: seed from `GET /api/presence` for the set of visible DM peer user ids and update from `presence.changed` events on the `presence` channel (and per-user channels as already implemented).

#### Scenario: DM peer presence updates within the presence budget

- **WHEN** a peer shown in the Direct messages list changes aggregate presence
- **THEN** that row's presence indicator updates within 2 seconds without a full page reload

#### Scenario: Initial presence is seeded for listed peers

- **WHEN** the Direct messages list renders with one or more peers
- **THEN** the client obtains an initial presence snapshot for those peer user ids before relying solely on live events so rows do not remain indefinitely without a status
