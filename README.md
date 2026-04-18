# Online Chat (hackathon)

A classic web-based online chat application: public and private rooms, 1:1
personal messages, contacts/friends, file and image sharing, basic moderation,
and persistent message history. Designed for ~300 concurrent users, ~1000
participants per room, and multi-year message retention.

> **Status:** R1 in progress — R0 MVP (auth, rooms, DMs, realtime text,
> unread badges, presence) shipped; R1 adds rich messaging: attachments
> (file + image) with membership-gated downloads, reply/quote, edit + soft
> delete with live `message.updated` / `message.deleted` events, multiline
> composer with emoji popover, paste-to-upload, and reply banner. R2–R4 not
> started; R5 is stretch. See the full [Roadmap](ROADMAP.md). `docker compose up`
> from repo root applies migrations on boot.
>
> **AI-only build:** This project is authored entirely by AI coding agents
> with **zero manual code changes**. Every commit, file, migration, test, and
> doc line was produced by agents driving the repo through the OpenSpec
> workflow — no human keystrokes have touched the source tree.

## Table of contents

- [Highlights](#highlights)
- [Stack](#stack)
- [Repository layout](#repository-layout)
- [Requirements](#requirements)
- [Release plan](#release-plan)
- [Setup & running locally](#setup--running-locally)
- [Environment variables](#environment-variables)
- [Development workflow](#development-workflow)
- [Submission](#submission)
- [Readme maintenance rule](#readme-maintenance-rule)

## Highlights

- Classic web-chat UX: top menu, side list of rooms + contacts, centred message
  thread, bottom composer, members panel.
- Public room catalog with search + unique room names; private rooms are
  invitation-only.
- Personal 1:1 dialogs with the same features as rooms.
- Real-time delivery under 3 s and presence propagation under 2 s.
- Persistent history with infinite scroll, virtualized to stay fast at 10 000+
  messages.
- Local-filesystem attachments (max 20 MB per file, 3 MB per image) with
  membership-gated downloads.
- Moderation: owner/admin roles, room bans, admin-deleted messages,
  invitations.
- Multi-tab aware presence (online / AFK / offline) and persistent login across
  browser restarts.

See [`REQUIREMENTS.md`](REQUIREMENTS.md) → [`docs/index.md`](docs/index.md) for
the authoritative specification.

## Stack

| Layer | Choice |
|-------|--------|
| App framework | Next.js 15+ (App Router), TypeScript |
| UI primitives | shadcn/ui (Tailwind CSS + Radix) |
| Realtime server | Centrifugo v6 (WebSocket / SSE; HTTP API + proxies) |
| Realtime client | centrifuge-js |
| Database | PostgreSQL |
| ORM | Prisma |
| Client global state | Zustand |
| Server/async data | TanStack Query |
| Long lists | React Virtuoso |
| Orchestration | Docker Compose (every runtime dep) |

All realtime transport is Centrifugo-based. No XMPP/Jabber or alternate
protocols are used; the stretch release scales Centrifugo horizontally instead.
Architecture and boundaries are detailed in [`AGENTS.md`](AGENTS.md).

## Repository layout

```
.
├── REQUIREMENTS.md              # pointer to spec
├── AGENTS.md                    # architecture + rules for agents & contributors
├── README.md                    # this file
├── docker-compose.yml           # traefik + app + db + centrifugo orchestration
├── Dockerfile                   # app container image (Node 20 + pnpm)
├── .env.example                 # all runtime env vars with dev defaults
├── next.config.ts               # Next.js config
├── tsconfig.json                # strict TS config with @/* alias
├── tailwind.config.ts           # Tailwind + shadcn theme tokens
├── postcss.config.mjs           # PostCSS pipeline
├── components.json              # shadcn/ui config (new-york, neutral)
├── eslint.config.mjs            # ESLint flat config (next/typescript)
├── package.json                 # pnpm scripts & deps
├── app/                         # Next.js App Router (pages + API routes)
│   ├── api/
│   │   ├── health/              # GET /api/health
│   │   └── centrifugo/connect/  # POST /api/centrifugo/connect
│   ├── (debug)/stack-check/     # smoke-test page (deleted by next change)
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   └── providers.tsx            # Query + Centrifuge client providers
├── lib/
│   ├── prisma.ts                # PrismaClient singleton
│   ├── logger.ts                # pino logger singleton
│   ├── centrifuge.ts            # centrifuge-js factory
│   ├── utils.ts                 # cn() helper
│   └── stores/
│       └── connection-store.ts  # Zustand Centrifugo connection state
├── prisma/
│   ├── schema.prisma            # User model (R0 placeholder)
│   └── migrations/              # committed migration history
├── centrifugo/
│   └── config.json              # mounted read-only into the container
├── docker/
│   └── app-entrypoint.sh        # migrate → next dev, JSON log lines
├── docs/                        # spec (functional, non-functional, plan)
└── openspec/                    # change proposals, deltas, archive
```

## Requirements

- Authoritative entry point: [`REQUIREMENTS.md`](REQUIREMENTS.md)
- Full spec TOC: [`docs/index.md`](docs/index.md)
- Individual sections:
  - [Introduction](docs/requirements/introduction.md)
  - [Functional](docs/requirements/functional.md)
  - [Non-functional](docs/requirements/non-functional.md)
  - [UI](docs/requirements/ui.md)
  - [Notes](docs/requirements/notes.md)
  - [Advanced (stretch)](docs/requirements/advanced.md)
  - [Submission](docs/requirements/submission.md)
  - [Wireframes](docs/requirements/appendix-wireframes.md)

## Release plan

Hackathon-priority ordering — each release is a self-contained, demo-able
product. See [`docs/plan/index.md`](docs/plan/index.md).

| Release | Theme | Status |
|---------|-------|--------|
| [R0 — Demo-able MVP](docs/plan/r0-mvp.md) | Compose, auth, rooms (public + private flag), DMs, realtime text, unread badges, online/offline presence | **done** |
| [R1 — Rich Messaging](docs/plan/r1-rich-messaging.md) | Attachments (file + image), reply, edit, delete, multiline, emoji | in progress |
| [R2 — Social & Presence](docs/plan/r2-social-presence.md) | Friends, blocks with frozen DMs, AFK/multi-tab, typing | not started |
| [R3 — Moderation & Admin](docs/plan/r3-moderation.md) | Roles, bans, invitations, Manage Room modal, live access revocation | not started |
| [R4 — Polish & Submission](docs/plan/r4-polish-scale.md) | Password reset, delete account, active sessions UI, 10k-message perf, 300-client load test, README polish, seed | not started |
| [R5 — Advanced (stretch)](docs/plan/r5-advanced.md) | Multi-node Centrifugo + Redis, bot/integration API, realtime admin dashboards | stretch |

## Setup & running locally

Prerequisites: **Docker** (with Compose v2). Nothing else is required on the
host — Node.js, pnpm, Postgres, and Centrifugo all run inside containers.

```bash
git clone <repo>
cd <repo>
docker compose up --build
# open http://localhost:3080
```

Creating a `.env` file is **optional**; `docker-compose.yml` ships working dev
defaults for every variable listed in [`.env.example`](.env.example). Copy and
customise only if you need to override them:

```bash
cp .env.example .env
```

### Ports

**Only Traefik publishes a host port.** All other services talk to each other
over the compose internal network. The host port is controlled by
`TRAEFIK_BIND_PORT` (default `3080`).

The **`app`** service has a Docker **healthcheck** (`GET /api/health` must return **200** with DB up). **Traefik** waits for `app` to be healthy before starting, so the published port is less likely to return **502** while Next.js is still booting.

| Port   | Service    | Notes                                                       |
|--------|------------|-------------------------------------------------------------|
| `3080` | traefik    | Single public entrypoint (override with `TRAEFIK_BIND_PORT`) |
| —      | app        | Internal only — Next.js listens on `3080` inside the container |
| —      | centrifugo | Internal only — Centrifugo listens on `3080` inside the container |
| —      | db         | Internal only — Postgres listens on `5432` inside the container |

Traefik routes:

| Path prefix           | Target             |
|-----------------------|--------------------|
| `/connection/*`       | `centrifugo:3080`  |
| everything else (`/`) | `app:3080`         |

Smoke checks once the stack is up:

- `http://localhost:3080/` — landing page (links to auth + app)
- `http://localhost:3080/sign-up` / `http://localhost:3080/sign-in` — cookie sessions
- `http://localhost:3080/rooms` — catalog (after sign-in)
- `http://localhost:3080/api/health` — `{"status":"ok","db":"up"}`
- `http://localhost:3080/stack-check` — TanStack Query + Virtuoso (Centrifugo
  `connected` only appears inside the authenticated app shell)

To access the database directly (e.g. with `psql` or Prisma Studio), exec into
the container or add a temporary `ports:` mapping to the `db` service.

JSON logs stream via `docker compose logs -f app`. For human-readable output
pipe through `pino-pretty` on the host:

```bash
docker compose logs -f app | npx pino-pretty
```

Shut down with `docker compose down`; add `-v` to wipe the Postgres and
uploads volumes.

### Resetting the database

The R0 migration replaces the earlier scaffold migration. If you already ran the
stack on this machine, reset volumes so Prisma can apply `0001_r0_init` on a
clean cluster:

```bash
docker compose down -v
docker compose up --build
```

## Environment variables

All variables below are documented in [`.env.example`](.env.example) with
dev-only defaults. Override by creating a local `.env`.

| Variable                        | Purpose                                             |
|---------------------------------|-----------------------------------------------------|
| `DATABASE_URL`                  | Prisma connection string (points at `db` service)   |
| `CENTRIFUGO_TOKEN_HMAC_SECRET`  | Shared HMAC secret for Centrifugo connect tokens    |
| `CENTRIFUGO_API_KEY`            | Centrifugo HTTP API key for server-to-server calls  |
| `CENTRIFUGO_URL`                | Centrifugo HTTP API URL (container network)         |
| `NEXT_PUBLIC_CENTRIFUGO_WS_URL` | WebSocket URL used by the browser                   |
| `SESSION_SECRET`                | iron-session password (≥ 32 chars in production)    |
| `UPLOADS_DIR`                   | Path for uploaded files (reserved for R1)           |
| `LOG_LEVEL`                     | pino log level (default `info`)                     |

## Production mode

The default `docker compose up` runs the app in **development** mode
(`next dev` with HMR, source bind-mounted from the host). For a real
production deployment use the separate, self-contained compose file
[`docker-compose.prod.yml`](docker-compose.prod.yml):

1. In `.env`, set the public-facing WebSocket URL and secrets:

   ```bash
   NEXT_PUBLIC_CENTRIFUGO_WS_URL=wss://your.domain/connection/websocket
   CENTRIFUGO_URL=http://centrifugo:3080          # stays on the internal network
   CENTRIFUGO_TOKEN_HMAC_SECRET=<random>
   CENTRIFUGO_API_KEY=<random>
   SESSION_SECRET=<32+ chars>
   ```

2. Build + start using **only** the prod file:

   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```

This builds the `production` target of the Dockerfile (`next build` +
`next start`), inlines `NEXT_PUBLIC_CENTRIFUGO_WS_URL` into the client
bundle, drops the dev source mount, and sets `NODE_ENV=production`.

`NEXT_PUBLIC_*` values are baked in at build time, so any change to them
requires `docker compose -f docker-compose.prod.yml build app` — a plain
`up -d` will **not** rebuild the bundle.

Verify:

```bash
docker compose -f docker-compose.prod.yml exec app printenv NODE_ENV   # production
docker compose -f docker-compose.prod.yml exec app ls .next/BUILD_ID   # exists
```

## Development workflow

Most contributors never need pnpm on the host — every script runs inside the
`app` container. To run them locally anyway:

```bash
pnpm install      # runs `prisma generate` via postinstall (types for @prisma/client)
pnpm dev          # Next.js dev server
pnpm build        # production build
pnpm lint         # ESLint
pnpm typecheck    # strict tsc --noEmit
pnpm test         # Vitest unit tests (jsdom + React Testing Library)
pnpm test:watch   # Vitest in watch mode
pnpm test:e2e     # Playwright E2E (stack must be up; see e2e/global-setup)
pnpm test:e2e:ui  # Playwright UI mode
pnpm db:migrate   # apply committed Prisma migrations
pnpm db:generate  # regenerate Prisma Client
pnpm db:studio    # open Prisma Studio
```

### End-to-end tests (Playwright)

Specs live under `e2e/` and run against a real, fully-wired Compose stack — not
a mocked app. `e2e/global-setup.ts` probes `GET /api/health` before the suite
starts and aborts fast if the stack isn't up.

**One-time setup**

```bash
pnpm install
pnpm exec playwright install chromium          # download the browser
# On Linux without system libs: pnpm exec playwright install --with-deps chromium
```

**Start the stack** (required every run — the app container is what serves
`/api/health`, migrates the DB, and talks to Centrifugo):

```bash
docker compose up -d --build
docker compose logs -f app                     # wait for "migrations applied, starting next dev"
curl -fsS http://localhost:3080/api/health     # should print {"status":"ok","db":"up"}
```

**Run the tests**

```bash
pnpm test:e2e                 # headless, full run
pnpm test:e2e:ui              # interactive UI mode (time-travel, watch, pick tests)
pnpm exec playwright test --headed        # headed browser
pnpm exec playwright test --debug         # Playwright Inspector, step-by-step
pnpm exec playwright test e2e/r0-acceptance.spec.ts:42 --ui   # single test at a line
pnpm exec playwright test -g "sign in" --ui                   # filter by title
pnpm exec playwright show-report          # open last HTML report
```

Point the suite at a non-default host/port via `PLAYWRIGHT_BASE_URL`:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3080 pnpm test:e2e:ui
```

**Troubleshooting**

If you see `Playwright: http://localhost:3080/api/health returned 500. Start
the stack: docker compose up`, the stack is either not running or the `app`
container is crashing before it can serve the route. Walk through:

1. **Is the stack up?** `docker compose ps` — every service (`db`, `centrifugo`,
   `app`, `traefik`) should be `running` / `healthy`.
2. **Did migrations succeed?** `docker compose logs app | tail -n 50`. Look for
   `migrations applied, starting next dev`. If `prisma migrate deploy` failed
   three times, the container exited and Traefik will return 5xx. Fix the
   migration (or reset data with `docker compose down -v` for a clean slate)
   and `docker compose up -d --build` again.
3. **Is the DB reachable?** `docker compose exec db pg_isready -U chat -d chat`
   should print `accepting connections`.
4. **Health probe directly against the app** (bypasses Traefik):
   `docker compose exec app wget -qO- http://localhost:3080/api/health`.
5. **Port conflict?** `TRAEFIK_BIND_PORT=3081 docker compose up -d` and rerun
   with `PLAYWRIGHT_BASE_URL=http://localhost:3081 pnpm test:e2e`.
6. **Stale build after deps changed?** `docker compose build --no-cache app`
   then `docker compose up -d`.

Run the tests from the **host** (not inside the `app` container) — Playwright
drives a browser that connects to the host-published `3080` port.

### CI scripts

Two shell scripts under `scripts/` package the pipelines so CI and local
reproductions stay identical:

| Script                        | What it does                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `scripts/ci-unit.sh`          | Preflights `pnpm`/`node`/`node_modules`, then runs `pnpm lint` → `pnpm typecheck` → `pnpm test` (Vitest). |
| `scripts/ci-e2e.sh`           | Preflights tooling + browser cache, `docker compose up -d --build`, waits for `/api/health`, runs Playwright, then **always** dumps per-service Compose logs and `playwright-report/` to `test-artifacts/` and tears the stack down. |
| `scripts/wait-for-health.sh`  | Helper: polls `$1/api/health` until 200 or timeout (used by `ci-e2e.sh`).                     |

The scripts **never install anything**. If a prerequisite is missing they exit
with code `2` and print the exact command you need to run. Expected host
state before invocation:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium       # add --with-deps on Linux (once)
```

Local use is identical to CI:

```bash
./scripts/ci-unit.sh
./scripts/ci-e2e.sh

TRAEFIK_BIND_PORT=3081 ./scripts/ci-e2e.sh          # avoid a port conflict
KEEP_STACK=1 ./scripts/ci-e2e.sh                    # leave Compose up for debugging
HEALTH_TIMEOUT=300 ./scripts/ci-e2e.sh              # slower machines

HEADED=1 ./scripts/ci-e2e.sh                        # visible browser
UI=1 ./scripts/ci-e2e.sh                            # Playwright UI mode
DEBUG=1 ./scripts/ci-e2e.sh                         # Playwright Inspector
HEADED=1 SLOWMO_MS=250 ./scripts/ci-e2e.sh          # slow each action down
E2E_ARGS='-g "sign in" --project=chromium' HEADED=1 ./scripts/ci-e2e.sh
xvfb-run -a ./scripts/ci-e2e.sh                     # headed on a headless box
```

`HEADED`, `UI`, and `DEBUG` all require a display server (X11 or Wayland). The
script aborts with a clear message if none is available — either run from a
desktop session or prefix with `xvfb-run -a`. These modes are for **local
debugging**; the GitHub Actions workflow always runs fully headless.

GitHub Actions is wired up in `.github/workflows/ci.yml` with two jobs:

- **unit** — runs `scripts/ci-unit.sh` on `ubuntu-latest`.
- **e2e** — runs `scripts/ci-e2e.sh` after `unit` passes, then uploads the
  `test-artifacts/` directory (Compose logs + Playwright HTML report + traces)
  as a workflow artifact so failures are debuggable without re-running.

Both jobs use `pnpm/action-setup` + Node 20 with pnpm store caching. The e2e
job runs Docker-in-runner (no service containers) because the repo's
`docker-compose.yml` is the authoritative runtime per the submission rules.

### Attachments and file storage (R1)

Uploads are streamed to the `uploads` named volume under
`${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}`. The on-disk filename is never
derived from user input; the original filename is preserved only in the DB
and served back via `Content-Disposition` on `GET /api/files/:id`.

Limits enforced on both client and server:

- 20 MB per non-image file
- 3 MB per image file (`image/*`)
- 500 bytes per optional attachment comment

Every file download re-checks room membership / DM participation on each
request, so losing access to a room immediately removes access to its
files. Staged attachments (uploaded but never attached to a message) are
purged by a manual GC script:

```bash
docker compose exec app pnpm tsx scripts/gc-staged-uploads.ts
```

This is a manual operation for R1 (cron/periodic hook is out of scope;
tracked as known debt).

To author a new migration, shell into the running `app` container (no ports
are published for `db`, so authoring from the host isn't possible without
temporarily exposing it):

```bash
docker compose exec app pnpm prisma migrate dev --name <describe-change>
```

## Submission

- Public GitHub repository.
- Project must be buildable and runnable with `docker compose up` in the
  repository root.
- Full rules: [`docs/requirements/submission.md`](docs/requirements/submission.md).

## Readme maintenance rule

This README is a living document. Whenever a change to the actual project state
lands, the README must be updated in the same change so that it stays truthful.
Triggers include, but are not limited to:

- First `docker-compose.yml` → fill [Setup & running locally](#setup--running-locally)
  with real commands and service URLs.
- First `.env.example` → fill [Environment variables](#environment-variables)
  with the real variable list and descriptions.
- Next.js app scaffolded (`package.json`, scripts) → fill
  [Development workflow](#development-workflow) with real commands.
- New release completed → tick it off under [Release plan](#release-plan) and
  refresh the [Status](#online-chat-hackathon) badge near the top.
- New top-level directory or tool → reflect it in
  [Repository layout](#repository-layout).
- New required runtime port → document it in setup + env sections.

Agents and contributors: do not split README updates into a "later" PR. If the
code is not real, neither is the README section — use a placeholder that says
so, but never let the README claim a capability the repo doesn't actually
ship.
