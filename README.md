# Online Chat (hackathon)

A classic web-based online chat application: public and private rooms, 1:1
personal messages, contacts/friends, file and image sharing, basic moderation,
and persistent message history. Designed for ~300 concurrent users, ~1000
participants per room, and multi-year message retention.

> **Status:** R0 scaffold complete — `docker compose up` from repo root boots
> Next.js, PostgreSQL, and Centrifugo with Prisma migrations applied on first
> boot. Feature work (auth, rooms, DMs, messaging) lands in subsequent
> changes. See [Readme maintenance rule](#readme-maintenance-rule).

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
| Realtime server | Centrifugo (WebSocket / SSE) |
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

| Release | Theme |
|---------|-------|
| [R0 — Demo-able MVP](docs/plan/r0-mvp.md) | Compose, auth, rooms (public + private flag), DMs, realtime text, unread badges, online/offline presence · scaffold ✅ |
| [R1 — Rich Messaging](docs/plan/r1-rich-messaging.md) | Attachments (file + image), reply, edit, delete, multiline, emoji |
| [R2 — Social & Presence](docs/plan/r2-social-presence.md) | Friends, blocks with frozen DMs, AFK/multi-tab, typing |
| [R3 — Moderation & Admin](docs/plan/r3-moderation.md) | Roles, bans, invitations, Manage Room modal, live access revocation |
| [R4 — Polish & Submission](docs/plan/r4-polish-scale.md) | Password reset, delete account, active sessions UI, 10k-message perf, 300-client load test, README polish, seed |
| [R5 — Advanced (stretch)](docs/plan/r5-advanced.md) | Multi-node Centrifugo + Redis, bot/integration API, realtime admin dashboards |

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

- `http://localhost:3080/` — landing page
- `http://localhost:3080/api/health` — `{"status":"ok","db":"up"}`
- `http://localhost:3080/stack-check` — TanStack Query, Centrifugo
  `connected` state, and a React Virtuoso list of 100 rows

To access the database directly (e.g. with `psql` or Prisma Studio), exec into
the container or add a temporary `ports:` mapping to the `db` service.

JSON logs stream via `docker compose logs -f app`. For human-readable output
pipe through `pino-pretty` on the host:

```bash
docker compose logs -f app | npx pino-pretty
```

Shut down with `docker compose down`; add `-v` to wipe the Postgres and
uploads volumes.

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
| `SESSION_SECRET`                | Secret for session cookies (used by R0 auth change) |
| `UPLOADS_DIR`                   | Path for uploaded files (reserved for R1)           |
| `LOG_LEVEL`                     | pino log level (default `info`)                     |

## Development workflow

Most contributors never need pnpm on the host — every script runs inside the
`app` container. To run them locally anyway:

```bash
pnpm install
pnpm dev          # Next.js dev server
pnpm build        # production build
pnpm lint         # ESLint
pnpm typecheck    # strict tsc --noEmit
pnpm db:migrate   # apply committed Prisma migrations
pnpm db:generate  # regenerate Prisma Client
pnpm db:studio    # open Prisma Studio
```

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
