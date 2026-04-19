## ADDED Requirements

### Requirement: Message authors are visually identifiable
The conversation view SHALL make message authors easy to scan by rendering a deterministic avatar next to each message and by using stronger visual contrast for the displayed username than the surrounding secondary metadata. Avatar rendering SHALL be deterministic for the same user across sessions and room reloads.

#### Scenario: Message row shows a deterministic avatar
- **WHEN** a message row is rendered for a given author
- **THEN** it includes an avatar generated from stable author identity data
- **AND** the same author renders the same avatar again after the conversation reloads

#### Scenario: Username is more prominent than metadata
- **WHEN** a message row renders the author username together with timestamp or edited-state metadata
- **THEN** the username uses stronger contrast than the surrounding secondary metadata
- **AND** the author label remains easy to distinguish while scanning a busy message thread

### Requirement: Message rows use compact contextual actions
The conversation view SHALL keep message actions visually secondary until the user interacts with a message. Each message row SHALL reveal a single-row, icon-only action toolbar on hover and on keyboard focus within the row, while lower-frequency actions remain available from the existing overflow menu. Highlighted message rows SHALL use a visibly stronger contrast than the default background.

#### Scenario: Hover reveals a one-row action toolbar
- **WHEN** the user hovers a message they can act on
- **THEN** the row reveals a compact horizontal toolbar of icon-only actions without reflowing the message body onto additional lines
- **AND** the existing overflow menu trigger remains available in the same action cluster for less-common actions

#### Scenario: Keyboard focus reveals the same actions
- **WHEN** the user tabs into a message row or one of its actions
- **THEN** the action toolbar remains visible without requiring mouse hover
- **AND** every revealed action remains reachable and operable by keyboard

#### Scenario: Highlighted message row is easy to distinguish
- **WHEN** a message row enters its highlighted state
- **THEN** the background and/or accent treatment has stronger contrast than the default row styling
- **AND** the highlighted row remains visually distinct even when adjacent rows contain attachments or hover chrome

### Requirement: Reply-jump navigation briefly flashes the source message
When the user activates a reply preview that jumps to the replied-to source message, the conversation view SHALL briefly flash the destination row after scrolling completes so the user can immediately spot it. The flash SHALL automatically clear after about 1 second and SHALL be repeatable on subsequent reply jumps to the same source message.

#### Scenario: Reply jump triggers a brief flash on the destination row
- **WHEN** the user clicks a reply preview and the list scrolls to the source message
- **THEN** the destination message row enters a visible flash state after the jump
- **AND** that flash automatically clears after roughly 1 second

#### Scenario: Repeated reply jumps retrigger the flash
- **WHEN** the user clicks the same reply preview again after the previous flash finished
- **THEN** the source message flashes again for the same brief duration
- **AND** the effect remains scoped to the destination row only

### Requirement: Composer editing shortcuts keep the working area anchored
The conversation composer SHALL support a first keyboard shortcut for editing: pressing `ArrowUp` while the composer is empty SHALL enter inline edit mode for the caller's most recent editable message in the active loaded conversation. Entering inline edit mode SHALL scroll the active message into view near the bottom working area, and the composer/editor chrome SHALL render as a single subtle border in both idle and focused states.

#### Scenario: ArrowUp edits the latest editable message
- **WHEN** the active conversation composer is empty and the user presses `ArrowUp`
- **THEN** the client locates the caller's most recent loaded message that is still editable
- **AND** the row enters inline edit mode instead of moving focus to an unrelated control

#### Scenario: Edit mode scrolls into the bottom work area
- **WHEN** the user enters inline edit mode for a message that is outside the current bottom working area
- **THEN** the message list scrolls so the edited row is visible close to the composer
- **AND** the user can immediately continue editing without manually hunting for the row

#### Scenario: Composer keeps a single subtle outline
- **WHEN** the composer is rendered idle or focused
- **THEN** it shows one light border treatment rather than stacked dark outer and focus borders
- **AND** the focus state remains visible without increasing the visual weight of the editor chrome
