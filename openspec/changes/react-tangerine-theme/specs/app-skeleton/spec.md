## ADDED Requirements

### Requirement: Root layout wires appearance and theme fonts

The application root layout SHALL wrap the document in an appearance provider compatible with persisted Light / Dark / Auto modes and SHALL load the Inter, Source Serif 4, and JetBrains Mono font stacks used by the React Tangerine token definitions so that all routes inherit correct typography and semantic colors.

#### Scenario: Provider wraps the app tree

- **WHEN** any page in the app is rendered
- **THEN** the appearance provider is an ancestor of client UI that depends on theme class or CSS variables
- **AND** theme toggling affects the entire app shell consistently

#### Scenario: Font stacks resolve

- **WHEN** a page renders body text and monospace content (e.g. code spans)
- **THEN** sans content uses the configured Inter-based stack
- **AND** monospace content uses the configured JetBrains Mono stack
