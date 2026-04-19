## ADDED Requirements

### Requirement: Signed-in users can change appearance

The signed-in application SHALL expose a user-visible control to set appearance to Light, Dark, or Auto. The control SHALL be reachable without developer tools (e.g. from the account Settings page and/or the top navigation user menu).

#### Scenario: User sets dark mode from settings

- **WHEN** a signed-in user opens account settings (or the designated appearance surface) and chooses Dark
- **THEN** the UI switches to the dark semantic palette immediately
- **AND** the choice persists across reload per the appearance capability

#### Scenario: User sets Auto from the shell

- **WHEN** a signed-in user selects Auto
- **THEN** the effective appearance follows the OS color scheme until the user selects a fixed Light or Dark mode again
