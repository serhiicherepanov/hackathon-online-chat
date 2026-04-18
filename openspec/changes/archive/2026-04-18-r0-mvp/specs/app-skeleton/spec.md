## MODIFIED Requirements

### Requirement: Prisma ORM wired against Postgres

The app SHALL use Prisma as its ORM against the Compose `db` service, with a committed initial migration that creates the full R0 data model (users, sessions, conversations, rooms, memberships, DM participants, messages, reads) so the app's features run against a real schema from first boot.

#### Scenario: Initial migration applies on boot

- **WHEN** the stack boots against an empty `pgdata` volume
- **THEN** the `app` container runs `prisma migrate deploy` as part of its startup sequence
- **AND** all R0 tables exist in the `chat` database after boot (`User`, `Session`, `Conversation`, `Room`, `RoomMember`, `DmParticipant`, `Message`, `MessageRead`)
- **AND** a `@prisma/client` import in application code can be constructed without runtime error

#### Scenario: `User` model enforces uniqueness invariants

- **WHEN** the generated Prisma schema is inspected
- **THEN** the `User` model declares unique constraints on `email` and `username`
- **AND** `username` is typed as `String` (immutability is enforced by application code, not DDL, but the field exists)
- **AND** the `User` model includes a `passwordHash` string field populated by the auth capability

#### Scenario: Migration history is clean

- **WHEN** `prisma/migrations/` is inspected
- **THEN** a single consolidated initial migration represents the R0 schema (the prior placeholder-only migration from the skeleton release is replaced, not layered on top)
