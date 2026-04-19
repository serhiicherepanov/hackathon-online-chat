# presence Specification

## Purpose

Defines presence: aggregate online / AFK / offline state derived from Centrifugo's active connection count on each `user:{id}` channel plus a client activity heartbeat (AFK when every connected tab has been idle for more than 60 seconds), an initial snapshot endpoint that seeds the UI before the first live event, and a live `presence.changed` fan-out that updates the members panel within 2 seconds of a state transition.

## Requirements

### Requirement: Online derived from Centrifugo connection count

The system SHALL derive aggregate presence for each user from both Centrifugo connection count on `user:{id}` and the user's recent activity heartbeat. A user SHALL be `offline` when Centrifugo reports zero active clients, `online` when at least one client is connected and the user has interacted with the app within the last 60 seconds, and `afk` when at least one client is connected but every tab has been idle for more than 60 seconds.

#### Scenario: First active tab flips user to online

- **WHEN** a user's first Centrifugo client subscribes to `user:{id}` and the user produces a recent activity heartbeat
- **THEN** the system publishes `presence.changed` with `{ userId, status: "online" }` on the shared `presence` channel and on `user:{id}`

#### Scenario: All tabs idle flips user to afk

- **WHEN** at least one Centrifugo client remains connected for user U but no activity heartbeat has been observed for more than 60 seconds
- **THEN** the system publishes `presence.changed` with `{ userId: U, status: "afk" }`
- **AND** the transition occurs within 2 seconds of the AFK threshold being crossed

#### Scenario: Activity in any tab restores online

- **WHEN** user U is currently `afk` and any open tab emits a fresh activity heartbeat
- **THEN** the system publishes `presence.changed` with `{ userId: U, status: "online" }` within 2 seconds

#### Scenario: Last disconnect flips user to offline

- **WHEN** a user's last Centrifugo client disconnects from `user:{id}` so the connection count transitions from 1 to 0
- **THEN** the system publishes `presence.changed` with `{ userId, status: "offline" }` on `presence` and on `user:{id}`
- **AND** the transition occurs within 2 seconds of the disconnect being detected by Centrifugo

#### Scenario: Additional tabs do not re-announce online

- **WHEN** a second or later Centrifugo client for the same user subscribes to `user:{id}` while the user is already `online`
- **THEN** the system does NOT publish a duplicate `online` event

### Requirement: Initial presence snapshot

The system SHALL expose an endpoint that returns the current aggregate presence status for a set of users of interest, used to seed the UI before the first live `presence.changed` arrives.

#### Scenario: Snapshot for a user id list

- **WHEN** an authenticated user calls `GET /api/presence?userIds=<csv>` with up to 1000 ids
- **THEN** the server responds with `200 OK` and a JSON array `[{ userId, status }]` where `status` is one of `"online"`, `"afk"`, or `"offline"`
- **AND** `status` is derived from the aggregate presence rules for each user

#### Scenario: Oversized request is rejected

- **WHEN** the request contains more than 1000 ids
- **THEN** the server responds with `400 Bad Request`

### Requirement: Members panel reflects presence

The members panel of a room SHALL show the current `online` / `afk` / `offline` state for each visible member, seeded from the initial snapshot and updated live from `presence.changed` events on the `presence` channel.

#### Scenario: Online dot appears when member becomes active

- **WHEN** a member of the currently open room is `offline`, and then connects and interacts with the app
- **THEN** the dot next to their username turns to the "online" style within 2 seconds, without a page reload

#### Scenario: AFK style appears when member idles

- **WHEN** a visible room member remains connected but becomes `afk`
- **THEN** the members panel updates that member's presence indicator to the AFK style within 2 seconds, without a page reload

#### Scenario: Offline style appears after final disconnect

- **WHEN** a visible room member closes their last tab and transitions to `offline`
- **THEN** the members panel updates that member's presence indicator to the offline style within a few seconds, without a page reload

### Requirement: Sidebar DM list reflects peer presence

The authenticated shell SHALL display each Direct messages row with the peer user's current aggregate presence (`online`, `afk`, or `offline`) using the same rules as the members panel: seed from `GET /api/presence` for the set of visible DM peer user ids and update from `presence.changed` events on the `presence` channel (and per-user channels as already implemented).

#### Scenario: DM peer presence updates within the presence budget

- **WHEN** a peer shown in the Direct messages list changes aggregate presence
- **THEN** that row's presence indicator updates within 2 seconds without a full page reload

#### Scenario: Initial presence is seeded for listed peers

- **WHEN** the Direct messages list renders with one or more peers
- **THEN** the client obtains an initial presence snapshot for those peer user ids before relying solely on live events so rows do not remain indefinitely without a status
