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
cp .env.example .env
# set production secrets/urls in .env:
#   NEXT_PUBLIC_CENTRIFUGO_WS_URL=wss://your.domain/connection/websocket
#   CENTRIFUGO_TOKEN_HMAC_SECRET=<random>
#   CENTRIFUGO_API_KEY=<random>
#   SESSION_SECRET=<32+ chars>
#   SESSION_COOKIE_DOMAIN=.digitalspace.studio  # optional, shared subdomains
docker compose -f docker-compose.prod.yml up -d --build
# open http://localhost:3080
```

Shut down with `docker compose -f docker-compose.prod.yml down`; add `-v` to
wipe the Postgres and uploads volumes.

### Ports

Only **Traefik** publishes a host port (controlled by `TRAEFIK_BIND_PORT`,
default `3080`). `app`, `db`, and `centrifugo` talk over the internal Compose
network. Traefik routes `/connection/*` to Centrifugo and everything else to
the Next.js app. The `app` service has a Docker healthcheck on `/api/health`;
Traefik waits for it before starting.

Smoke checks once the stack is up:

- `http://localhost:3080/` — landing page
- `http://localhost:3080/sign-up` / `/sign-in` / `/forgot-password`
- `http://localhost:3080/rooms` — catalog (after sign-in)
- `http://localhost:3080/settings` — profile, password, sessions, and delete-account UI
- `http://localhost:3080/api/health` — `{"status":"ok","db":"up","centrifugo":"up"}`

JSON logs stream via `docker compose logs -f app`; pipe through `pino-pretty`
for human-readable output.

## Environment variables

All variables are documented in [`.env.example`](.env.example).

| Variable                        | Purpose                                             |
|---------------------------------|-----------------------------------------------------|
| `DATABASE_URL`                  | Prisma connection string (points at `db` service)   |
| `CENTRIFUGO_TOKEN_HMAC_SECRET`  | HMAC secret for Centrifugo connect tokens           |
| `CENTRIFUGO_API_KEY`            | Centrifugo HTTP API key for server-to-server calls  |
| `CENTRIFUGO_URL`                | Centrifugo HTTP API base URL (may include a Traefik path prefix if the app calls Centrifugo on a public host) |
| `NEXT_PUBLIC_CENTRIFUGO_WS_URL` | WebSocket URL used by the browser                   |
| `SESSION_SECRET`                | iron-session password (≥ 32 chars in production)    |
| `SESSION_COOKIE_DOMAIN`         | Optional shared cookie domain, e.g. `.example.com` |
| `UPLOADS_DIR`                   | Path for uploaded files                             |
| `PASSWORD_RESET_DELIVERY_FILE`  | Optional JSONL artifact file for dev/test reset URLs |
| `LOG_LEVEL`                     | pino log level (default `info`)                     |

## Development mode (optional)

Use [`docker-compose.yml`](docker-compose.yml) when you need `next dev` + HMR
and source bind-mounts:

```bash
docker compose up --build
```

This file includes dev-friendly defaults from [`.env.example`](.env.example).
Use it for local iteration only; the production compose file remains the
deployment path.

## Development workflow

Most contributors never need pnpm on the host — every script runs inside the
`app` container (`docker compose exec app pnpm <script>`). To run on the host:

```bash
pnpm install      # runs `prisma generate` via postinstall
pnpm dev          # Next.js dev server
pnpm build        # production build
pnpm lint         # ESLint
pnpm typecheck    # strict tsc --noEmit
pnpm verify:ci    # prisma generate + lint + typecheck + unit tests + production build
pnpm test         # Vitest unit tests
pnpm db:migrate   # apply committed Prisma migrations
pnpm db:generate  # regenerate Prisma Client
pnpm db:studio    # open Prisma Studio
```

For end-to-end testing and CI scripts see [`TESTING.md`](TESTING.md).

### Demo and benchmark seeds

Seed the reviewer-friendly social graph from the running app container:

```bash
docker compose exec app pnpm seed:social
```

This creates demo users `alice`, `bob`, `carol`, and `dave` with password
`password1234`, plus accepted/pending/block relationships for the contacts and
DM flows.

Seed the large-history benchmark fixture:

```bash
docker compose exec app pnpm seed:benchmark-history
```

This creates (or tops up) the public room `r4-benchmark-10k` so it contains at
least 10,000 persisted messages, owned by `bench_admin`.

### Realtime load test (~300 clients)

From the **app** container (uses internal `centrifugo:3080` for WebSocket and HTTP
API — see `scripts/load-test-realtime.ts`):

```bash
docker compose exec app pnpm seed:loadtest-users
docker compose exec app pnpm loadtest:realtime
```

This seeds users `lt4_000` … `lt4_<N-1>` plus shared room `r4-loadtest-presence`,
opens `N` concurrent `centrifuge-js` connections with the same subscriptions as
production (`user:{id}`, `presence`, `room:{conversationId}`), samples Centrifugo
room presence, publishes one room event to measure fan-out latency, and prints
JSON metrics (connect / subscribe / delivery percentiles).

Capture a full R4 performance log (benchmark seed + load test) under `test-artifacts/`:

```bash
docker compose exec app pnpm verify:r4-perf
```

If `pnpm tsx` or new scripts are missing inside the container, the `app_node_modules`
named volume can be masking an outdated install. Recreate it (after stopping the
stack) with `docker volume rm <project>_app_node_modules`, then bring the stack
back up and run `docker compose exec app pnpm install`.

### Password reset delivery

In development and e2e, password reset requests also append JSON lines to
`${PASSWORD_RESET_DELIVERY_FILE}` inside the app container. The default path is:

```bash
/app/uploads/password-reset-deliveries.log
```

That keeps the API response generic while still giving reviewers and automated
tests a real dev/test delivery artifact to inspect.

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
