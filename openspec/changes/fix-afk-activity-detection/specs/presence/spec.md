## ADDED Requirements

### Requirement: Client activity heartbeat cadence and activity gate

The client SHALL send presence heartbeats to `POST /api/presence/heartbeat` on a fixed interval of no more than 20 seconds whenever the user has produced any input activity within the last 25 seconds in the current tab, so that at least two heartbeats land inside the 60-second server-side AFK window while the user is actively interacting.

#### Scenario: Interacting user stays online across multiple AFK windows

- **WHEN** a signed-in user keeps a tab focused and produces at least one pointer, mouse, keyboard, wheel, scroll, or touch event every 20 seconds for 3 minutes
- **THEN** the client sends at least one heartbeat every 20 seconds
- **AND** the user's aggregate presence status remains `online` for the entire 3 minutes with no transition to `afk`

#### Scenario: Activity inside a modal / overlay still counts

- **WHEN** the user interacts (mouse move, key press, click) inside a dialog, popover, or menu subtree whose inner handlers call `stopPropagation`
- **THEN** the client activity gate still records the interaction and the next heartbeat is sent as scheduled

### Requirement: Immediate heartbeat on visibility and focus restore

The client SHALL send a heartbeat immediately (outside the periodic interval) when the tab becomes visible or regains window focus, so that a user returning to a previously backgrounded tab transitions from `afk` back to `online` within 2 seconds without waiting for the next interval tick.

#### Scenario: Returning to a hidden tab

- **WHEN** a tab's `visibilityState` transitions from `hidden` to `visible`
- **THEN** the client sends a heartbeat within 500 ms of the transition

#### Scenario: Window regains focus

- **WHEN** the browser window receives a `focus` event for this tab
- **THEN** the client sends a heartbeat within 500 ms of the event

### Requirement: Activity gate is a pure, unit-tested decision

The activity-gate decision ("should a heartbeat be sent now given the last activity timestamp?") SHALL be implemented as a pure function, isolated from DOM and network, and covered by unit tests that exercise the boundary cases around the activity window and the server AFK window.

#### Scenario: Recent activity beats

- **WHEN** the current time is within the activity window of `lastActivityAt`
- **THEN** the helper returns `true`

#### Scenario: Stale activity does not beat

- **WHEN** the current time is outside the activity window of `lastActivityAt`
- **THEN** the helper returns `false`
