# app-skeleton Specification

## Purpose

Defines the baseline application skeleton for the hackathon online chat: a one-command Docker Compose boot that brings up the Next.js app, PostgreSQL, and Centrifugo; Prisma ORM wiring with an initial migration; Centrifugo token-authenticated connectivity; client provider wiring (TanStack Query, Centrifugo client, Zustand, React Virtuoso); a Tailwind + shadcn/ui UI toolkit; a landing page and health endpoint; live reload during development; JSON structured logging; and a README that accurately reflects the delivered setup. This capability is the foundation all subsequent chat features build on.
## Requirements
### Requirement: One-command stack boot

The repository SHALL boot the full application stack — Next.js app, PostgreSQL database, and Centrifugo — with a single `docker compose up` command run from the repository root, with no manual migration, seeding, or configuration step required on a fresh clone.

#### Scenario: Fresh clone boots successfully

- **WHEN** a developer runs `git clone <repo>` and then `docker compose up` from the repository root on a machine that has only Docker installed
- **THEN** three services (`app`, `db`, `centrifugo`) reach a running state
- **AND** the `app` service logs indicate the Next.js server is listening on port 3000
- **AND** `http://localhost:3000/` responds with HTTP 200 and renders a landing page
- **AND** no additional commands (migrate, seed, install) are required from the developer

#### Scenario: App waits for database readiness

- **WHEN** the stack is booted and the database takes longer than the app to become ready
- **THEN** the `app` service waits until the `db` service passes its healthcheck before starting
- **AND** Prisma migrations run to completion before the Next.js server begins accepting requests

### Requirement: Environment configuration via `.env.example`

The repository SHALL include a committed `.env.example` that lists every environment variable consumed by the stack, with dev-only default values that allow `docker compose up` to succeed without the developer creating a `.env` file first.

#### Scenario: Example env is complete

- **WHEN** a reviewer reads `.env.example`
- **THEN** it contains entries for `DATABASE_URL`, `CENTRIFUGO_TOKEN_HMAC_SECRET`, `CENTRIFUGO_API_KEY`, `CENTRIFUGO_URL`, `NEXT_PUBLIC_CENTRIFUGO_WS_URL`, `SESSION_SECRET`, and `UPLOADS_DIR`
- **AND** every variable referenced by `docker-compose.yml`, the `app` service, or `centrifugo/config.json` is present in `.env.example`

#### Scenario: Defaults allow boot without a local `.env`

- **WHEN** the repository has no `.env` file and the developer runs `docker compose up`
- **THEN** the stack still boots successfully using defaults declared in `docker-compose.yml` or `.env.example`

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

### Requirement: Centrifugo reachable and token-authenticated

The browser SHALL be able to obtain a Centrifugo connection token from the Next.js app and establish a WebSocket connection to Centrifugo using that token.

#### Scenario: Connect token is issued in development

- **WHEN** the browser sends `POST /api/centrifugo/connect` in a non-production environment
- **THEN** the app responds with `200 OK` and a JSON body `{ "token": "<jws>" }`
- **AND** the token is a JWT signed with HS256 using `CENTRIFUGO_TOKEN_HMAC_SECRET`
- **AND** the token's `sub` claim identifies a dev user and `exp` is within 10 minutes of issuance

#### Scenario: Production endpoint refuses unauthenticated callers

- **WHEN** `NODE_ENV` is `production` and `POST /api/centrifugo/connect` is called without a valid session cookie
- **THEN** the app responds with `401 Unauthorized`
- **AND** no token is issued

#### Scenario: Browser connects to Centrifugo with issued token

- **WHEN** the `/stack-check` page loads in the browser
- **THEN** the `centrifuge-js` client fetches a token from `/api/centrifugo/connect` and opens a WebSocket to `NEXT_PUBLIC_CENTRIFUGO_WS_URL`
- **AND** the client reaches `connected` state within 5 seconds of page load

### Requirement: Client provider wiring

The Next.js app SHALL wrap the application tree in the providers required by the stack — TanStack Query and a Centrifugo client — and expose Zustand stores consumable via hooks.

#### Scenario: Providers are present in the root layout

- **WHEN** the app's root layout is rendered
- **THEN** `<QueryClientProvider>` wraps the application subtree
- **AND** a Centrifugo client is instantiated exactly once per browser session and disconnected on unmount
- **AND** at least one Zustand store exists and is importable from `lib/stores/`

#### Scenario: React Virtuoso is available for large lists

- **WHEN** the `react-virtuoso` package is imported from application code
- **THEN** the import resolves and a `<Virtuoso>` component can be rendered without additional configuration

### Requirement: UI toolkit initialized

The app SHALL have Tailwind CSS and shadcn/ui initialized (config files, theme tokens, `components.json`) so subsequent changes can add primitives via `npx shadcn@latest add <name>` without further setup.

#### Scenario: shadcn init artifacts exist

- **WHEN** the repository is inspected
- **THEN** `tailwind.config.ts`, `postcss.config.mjs`, `app/globals.css` (with Tailwind directives and shadcn CSS variables), and `components.json` are present and consistent
- **AND** `lib/utils.ts` exports a `cn()` helper

### Requirement: Landing page and health endpoint

The app SHALL serve a landing page at `/` and a health endpoint at `/api/health` so reviewers can verify the stack is up without running any feature code.

#### Scenario: Landing page renders

- **WHEN** a browser requests `GET /`
- **THEN** the app responds with `200 OK` and HTML containing the project name and a link to the hackathon docs
- **AND** no authentication is required

#### Scenario: Health endpoint reports database connectivity

- **WHEN** `GET /api/health` is called
- **THEN** the app executes a trivial Prisma query (e.g., `SELECT 1`)
- **AND** responds with `200 OK` and JSON `{ "status": "ok", "db": "up" }` on success
- **AND** responds with `503` and `{ "status": "degraded", "db": "down" }` if the database is unreachable

### Requirement: Live reload during development

The `app` service SHALL reflect source edits made on the host in the running container without an image rebuild, so that Next.js Turbopack HMR updates the browser within a few seconds of a file save.

#### Scenario: Editing a page triggers HMR

- **WHEN** the stack is running and a developer edits `app/page.tsx` on the host and saves
- **THEN** the `app` container observes the file change via its bind-mounted source
- **AND** Next.js recompiles the affected module and the browser page reflects the change without a manual reload and without `docker compose restart`

#### Scenario: Host `node_modules` does not shadow the image

- **WHEN** the host filesystem contains no `node_modules`, or contains one built for a different platform
- **THEN** the container still resolves all dependencies from its image-installed `node_modules` (via an anonymous volume mount on `/app/node_modules`)
- **AND** `pnpm dev` starts without module-resolution errors

### Requirement: JSON structured logging

The application SHALL emit all log output as single-line JSON records using a shared `pino`-based logger, in both development and production, so log shape is uniform across environments.

#### Scenario: Log lines are valid JSON

- **WHEN** the `app` container is running and any application log is emitted (server startup, request handler, Prisma event, migrate script)
- **THEN** each log line written to stdout is valid JSON parseable by `jq`
- **AND** each record contains at least `level`, `time`, `msg`, `service`, and `env` fields

#### Scenario: Log level is configurable via environment

- **WHEN** the `LOG_LEVEL` environment variable is set (e.g., `debug`, `info`, `warn`, `error`)
- **THEN** the logger honors that level and suppresses records below it
- **AND** when `LOG_LEVEL` is unset, the default level is `info`

### Requirement: README reflects reality

`README.md` SHALL document the actual, working setup flow delivered by this change, per the living-doc rule in `AGENTS.md`.

#### Scenario: Setup section is accurate

- **WHEN** a reviewer follows the README's "Setup & running locally" section on a fresh clone
- **THEN** every command shown works against the current `HEAD` without modification
- **AND** the documented service URLs (`http://localhost:3000`, Centrifugo WS URL, Postgres port) match what `docker-compose.yml` actually exposes
- **AND** the "Environment variables" section lists exactly the variables in `.env.example`

### Requirement: Stack startup exposes submission-ready health signals
The repository SHALL expose health/readiness signals that let automation and reviewers determine when the app stack is actually ready for use, not merely when the containers have started.

#### Scenario: Health endpoint reflects application readiness
- **WHEN** the documented health check is called after `docker compose up`
- **THEN** it reports success only after the app can reach its required backing services and serve authenticated product routes
- **AND** the compose stack includes corresponding health/readiness wiring for the services it depends on

### Requirement: Reviewer bootstrap flow includes seed/demo guidance
The repository SHALL document and ship the bootstrap path needed to prepare a reviewer-friendly environment, including any seed/demo data commands and the expected access URL.

#### Scenario: Bootstrap guidance is discoverable in-repo
- **WHEN** a reviewer inspects the root project documentation
- **THEN** they can identify the exact URL, commands, and seed/bootstrap steps needed to open the app and begin the release demo
- **AND** the documented flow matches the current compose files and application startup behavior

