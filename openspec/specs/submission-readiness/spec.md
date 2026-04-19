# submission-readiness Specification

## Purpose
TBD - created by archiving change r4. Update Purpose after archive.
## Requirements
### Requirement: Fresh-clone reviewers can boot a demo-ready stack
The repository SHALL provide a documented bootstrap path that brings up the application, applies migrations, and makes reviewer/demo data available from the repo without requiring private local knowledge.

#### Scenario: Reviewer follows the documented setup flow
- **WHEN** a reviewer follows the R4 setup steps from the repository on a fresh clone
- **THEN** `docker compose up` starts the stack successfully using the documented environment template
- **AND** the documented seed/bootstrap command prepares demo-ready data when the base stack does not already include it

### Requirement: Submission docs match the actual runnable project
The repository SHALL include reviewer-facing documentation that accurately describes setup, environment variables, service URLs, demo flows, and submission-time commands for the current `HEAD`.

#### Scenario: README and submission notes stay in sync
- **WHEN** the repository's setup and submission docs are inspected after an R4 change
- **THEN** every documented command and URL matches the current compose/app configuration
- **AND** the docs identify the demo accounts or seed flow a reviewer should use

### Requirement: Reproducible scale and performance verification artifacts exist
The repository SHALL contain repeatable scripts and supporting fixtures for validating the R4 non-functional targets: large message history usability and approximately 300 concurrent realtime clients.

#### Scenario: Load-test script reports delivery metrics
- **WHEN** the project load-test command is run against the intended R4 stack
- **THEN** it exercises approximately 300 concurrent clients across the supported conversation mix
- **AND** it emits reportable delivery and presence latency metrics suitable for checking the release thresholds

#### Scenario: Large-history benchmark fixture is available
- **WHEN** a developer prepares the 10k-message benchmark environment
- **THEN** the repository provides a repeatable fixture or seed path that creates a room with at least 10,000 messages
- **AND** the same path can be reused for manual or automated validation of the conversation UI

