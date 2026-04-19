## ADDED Requirements

### Requirement: Sidebar unread badges preserve row layout
The sidebar SHALL present unread badges in a way that does not change conversation row height or cause visible layout shift as unread counts appear, grow, shrink, or clear. Unread badges with a non-zero count SHALL use an accent treatment that is visually stronger than the muted/default chip styling.

#### Scenario: Count changes do not shift the row layout
- **WHEN** a sidebar conversation row transitions between no unread badge, a one-digit unread count, and a multi-digit unread count
- **THEN** the overall row height remains unchanged
- **AND** adjacent rows do not visibly jump up or down as the count changes

#### Scenario: Unread badge uses an accented visual state
- **WHEN** a conversation has `unread > 0`
- **THEN** its sidebar badge renders with a colored unread treatment instead of a neutral gray chip
- **AND** the badge remains readable against the surrounding sidebar surface
