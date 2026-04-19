## ADDED Requirements

### Requirement: React Tangerine semantic tokens

The application SHALL use the React Tangerine Theme OKLCH values for shadcn/ui semantic CSS variables in both light and dark presentations, including at minimum: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, `--chart-1` through `--chart-5`, sidebar variables (`--sidebar`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`), `--radius`, and `--spacing`. Font family variables SHALL reference Inter (sans), Source Serif 4 (serif), and JetBrains Mono (monospace) as loaded by the app.

#### Scenario: Light palette applies to the default document

- **WHEN** the effective appearance is light
- **THEN** computed styles for semantic variables match the Tangerine light token map
- **AND** components using Tailwind semantic classes (e.g. `bg-background`, `text-foreground`) render with those colors

#### Scenario: Dark palette applies when dark is effective

- **WHEN** the effective appearance is dark
- **THEN** computed styles for semantic variables match the Tangerine dark token map

### Requirement: Color mode selection

The user agent SHALL support three explicit appearance modes: **Light** (force light), **Dark** (force dark), and **Auto** (follow `prefers-color-scheme`). Switching mode SHALL update the effective palette immediately without a full page reload.

#### Scenario: Auto tracks the OS

- **WHEN** the user selects Auto and the OS color scheme is dark
- **THEN** the effective presentation is dark
- **WHEN** the OS color scheme changes to light
- **THEN** the effective presentation becomes light without requiring a manual toggle

#### Scenario: Light overrides the OS

- **WHEN** the user selects Light while the OS is in dark mode
- **THEN** the effective presentation is light

### Requirement: Persist appearance locally

The application SHALL persist the user’s selected mode (Light, Dark, or Auto) in browser `localStorage` (or equivalent supported by the theme library) under a stable application-specific key so that subsequent visits and new tabs in the same browser restore the last choice.

#### Scenario: Reload preserves choice

- **WHEN** a user sets appearance to Dark and reloads the page
- **THEN** the UI remains dark without requiring another interaction

### Requirement: Minimal flash on first paint

The application SHALL apply the stored or system-derived appearance before first meaningful paint where technically feasible (e.g. inline bootstrap script or library-supported pattern), so users rarely see a full frame of the wrong theme.

#### Scenario: Returning visitor sees correct theme immediately

- **WHEN** a returning visitor has Dark stored and opens the app
- **THEN** the first paint does not show the light palette in full before switching to dark
