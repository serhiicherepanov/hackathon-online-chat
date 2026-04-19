# Online Chat (hackathon)

A classic web-based online chat: public and private rooms, 1:1 personal
messages, contacts/friends, file and image sharing, basic moderation, and
persistent message history. Sized for ~300 concurrent users, ~1000 participants
per room, and multi-year retention.

> **AI-only build:** This project is authored entirely by AI coding agents with
> zero manual code changes. Every commit, file, migration, test, and doc line
> was produced by agents driving the repo through the OpenSpec workflow.

- **Spec:** [`REQUIREMENTS.md`](REQUIREMENTS.md) → [`docs/index.md`](docs/index.md)
- **Roadmap / releases:** [`ROADMAP.md`](ROADMAP.md)
- **Architecture & contributor rules:** [`AGENTS.md`](AGENTS.md)
- **Testing / CI:** [`TESTING.md`](TESTING.md)
- **Submission rules:** [`docs/requirements/submission.md`](docs/requirements/submission.md)

## Stack

| Layer | Choice |
|-------|--------|
| App framework | Next.js 15+ (App Router), TypeScript |
| UI primitives | shadcn/ui (Tailwind CSS + Radix) |
| Realtime server | Centrifugo v6 (WebSocket / SSE) |
| Realtime client | centrifuge-js |
| Database | PostgreSQL + Prisma |
| Client state | Zustand |
| Server/async data | TanStack Query |
| Long lists | React Virtuoso |
| Orchestration | Docker Compose |

All realtime transport is Centrifugo-based. No XMPP/Jabber or alternate
protocols.

## Quick start

Prerequisites: **Docker** (Compose v2). Nothing else is required on the host —
Node.js, pnpm, Postgres, and Centrifugo all run inside containers.

```bash
git clone <repo>
cd <repo>
docker compose up --build
# open http://localhost:3080
```

Creating a `.env` file is optional; `docker-compose.yml` ships working dev
defaults for every variable listed in [`.env.example`](.env.example). Copy and
customise if you need overrides:

```bash
cp .env.example .env
```

Shut down with `docker compose down`; add `-v` to wipe the Postgres and
uploads volumes.

### Ports

Only **Traefik** publishes a host port (controlled by `TRAEFIK_BIND_PORT`,
default `3080`). `app`, `db`, and `centrifugo` talk over the internal Compose
network. Traefik routes `/connection/*` to Centrifugo and everything else to
the Next.js app. The `app` service has a Docker healthcheck on `/api/health`;
Traefik waits for it before starting.

Smoke checks once the stack is up:

- `http://localhost:3080/` — landing page
- `http://localhost:3080/sign-up` / `/sign-in`
- `http://localhost:3080/rooms` — catalog (after sign-in)
- `http://localhost:3080/api/health` — `{"status":"ok","db":"up"}`

JSON logs stream via `docker compose logs -f app`; pipe through `pino-pretty`
for human-readable output.

## Environment variables

All variables are documented in [`.env.example`](.env.example) with dev-only
defaults.

| Variable                        | Purpose                                             |
|---------------------------------|-----------------------------------------------------|
| `DATABASE_URL`                  | Prisma connection string (points at `db` service)   |
| `CENTRIFUGO_TOKEN_HMAC_SECRET`  | HMAC secret for Centrifugo connect tokens           |
| `CENTRIFUGO_API_KEY`            | Centrifugo HTTP API key for server-to-server calls  |
| `CENTRIFUGO_URL`                | Centrifugo HTTP API URL (container network)         |
| `NEXT_PUBLIC_CENTRIFUGO_WS_URL` | WebSocket URL used by the browser                   |
| `SESSION_SECRET`                | iron-session password (≥ 32 chars in production)    |
| `UPLOADS_DIR`                   | Path for uploaded files                             |
| `LOG_LEVEL`                     | pino log level (default `info`)                     |

## Production mode

The default `docker compose up` runs the app in **development** mode
(`next dev` + HMR, source bind-mounted). For a real deployment use the
self-contained [`docker-compose.prod.yml`](docker-compose.prod.yml):

```bash
# set public WS URL + secrets in .env first:
#   NEXT_PUBLIC_CENTRIFUGO_WS_URL=wss://your.domain/connection/websocket
#   CENTRIFUGO_TOKEN_HMAC_SECRET=<random>
#   CENTRIFUGO_API_KEY=<random>
#   SESSION_SECRET=<32+ chars>

docker compose -f docker-compose.prod.yml up -d --build
```

This builds the `production` target (`next build` + `next start`), inlines
`NEXT_PUBLIC_*` values into the client bundle, drops the dev source mount, and
sets `NODE_ENV=production`. Because `NEXT_PUBLIC_*` are baked at build time,
any change to them requires `docker compose -f docker-compose.prod.yml build app`
— a plain `up -d` will not rebuild the bundle.

## Development workflow

Most contributors never need pnpm on the host — every script runs inside the
`app` container (`docker compose exec app pnpm <script>`). To run on the host:

```bash
pnpm install      # runs `prisma generate` via postinstall
pnpm dev          # Next.js dev server
pnpm build        # production build
pnpm lint         # ESLint
pnpm typecheck    # strict tsc --noEmit
pnpm test         # Vitest unit tests
pnpm db:migrate   # apply committed Prisma migrations
pnpm db:generate  # regenerate Prisma Client
pnpm db:studio    # open Prisma Studio
```

For end-to-end testing and CI scripts see [`TESTING.md`](TESTING.md).

### Attachments

Uploads stream to the `uploads` named volume under
`${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}`. On-disk filenames are never derived
from user input; the original name is preserved in the DB and served back via
`Content-Disposition` on `GET /api/files/:id`. Every download re-checks room
membership / DM participation. Limits: 20 MB per non-image file, 3 MB per
image, 500 bytes per optional comment.

Staged attachments (uploaded but never attached) are purged manually:

```bash
docker compose exec app pnpm tsx scripts/gc-staged-uploads.ts
```

### Authoring a migration

```bash
docker compose exec app pnpm prisma migrate dev --name <describe-change>
```

## Submission

- Public GitHub repository.
- Project must be buildable and runnable with `docker compose up` in the
  repository root.
- Full rules: [`docs/requirements/submission.md`](docs/requirements/submission.md).
