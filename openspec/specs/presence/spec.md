# presence Specification

## Purpose

Defines R0 presence: binary online/offline state derived from Centrifugo's active connection count on each `user:{id}` channel (no AFK state in R0), an initial snapshot endpoint that seeds the UI before the first live event, and a live `presence.changed` fan-out that updates the members panel within 2 seconds of a state transition.

## Requirements

### Requirement: Online derived from Centrifugo connection count

The system SHALL consider a user `online` if and only if Centrifugo reports at least one active client connected on their `user:{id}` channel, and `offline` otherwise. No AFK state is computed in R0.

#### Scenario: First connect flips user to online

- **WHEN** a user's first Centrifugo client subscribes to `user:{id}` (i.e., the connection count transitions from 0 to 1)
- **THEN** the system publishes `presence.changed` with `{ userId, status: "online" }` on the shared `presence` channel and on `user:{id}`

#### Scenario: Last disconnect flips user to offline

- **WHEN** a user's last Centrifugo client disconnects from `user:{id}` (connection count transitions from 1 to 0)
- **THEN** the system publishes `presence.changed` with `{ userId, status: "offline" }` on `presence` and on `user:{id}`
- **AND** the transition occurs within 2 seconds of the disconnect being detected by Centrifugo

#### Scenario: Additional tabs do not re-announce online

- **WHEN** a second or later Centrifugo client for the same user subscribes to `user:{id}` while the user is already online
- **THEN** the system does NOT publish a duplicate `online` event

### Requirement: Initial presence snapshot

The system SHALL expose an endpoint that returns the current online/offline status for a set of users of interest (e.g., members of an opened room), used to seed the UI before the first live `presence.changed` arrives.

#### Scenario: Snapshot for a user id list

- **WHEN** an authenticated user calls `GET /api/presence?userIds=<csv>` with up to 1000 ids
- **THEN** the server responds with `200 OK` and a JSON array `[{ userId, status }]` where `status` is `"online"` or `"offline"`
- **AND** `status` is derived from Centrifugo's presence data for `user:{id}` channels

#### Scenario: Oversized request is rejected

- **WHEN** the request contains more than 1000 ids
- **THEN** the server responds with `400 Bad Request`

### Requirement: Members panel reflects presence

The members panel of a room SHALL show an online/offline dot for each member, seeded from the initial snapshot and updated live from `presence.changed` events on the `presence` channel.

#### Scenario: Online dot appears when member comes online

- **WHEN** a member of the currently open room is offline, and then connects
- **THEN** the dot next to their username turns to the "online" color within 2 seconds, without a page reload
