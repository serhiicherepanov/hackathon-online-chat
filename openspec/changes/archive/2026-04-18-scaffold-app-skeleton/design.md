## Context

The repository has `AGENTS.md`, `REQUIREMENTS.md`, and a phased plan (R0–R5) but zero runnable code. R0's acceptance script opens with *"`docker compose up` from repo root boots app, db, centrifugo with no manual steps"* — that sentence cannot be satisfied today. This change delivers exactly the substrate needed to satisfy that line and unblock every R0 feature PR. Stakeholders are the hackathon team and reviewers who will run `docker compose up` on a clean checkout.

The stack is fixed by AGENTS.md: **Next.js 15 App Router + TypeScript, PostgreSQL + Prisma, Centrifugo + centrifuge-js, shadcn/ui on Tailwind, TanStack Query, Zustand, React Virtuoso.** Deviations are not on the table; design decisions here concern *how the pieces are wired together*, not *what the pieces are*.

## Goals / Non-Goals

**Goals:**
- One command (`docker compose up`) on a fresh clone produces a running app on `http://localhost:3000`, a Postgres reachable from the app, and a Centrifugo reachable from both app (HTTP API) and browser (WebSocket).
- Prisma migrations run automatically on app startup against the Compose database; a placeholder `User` model proves the ORM path end-to-end.
- Browser can establish a Centrifugo connection using a JWT minted by the Next.js app (even though auth is not implemented — the token route stubs a dev identity in non-prod, returns 401 in prod). This validates the realtime round-trip before R0 features layer on.
- Provider wiring (TanStack Query, Zustand, Centrifuge client) is in place so feature PRs add hooks/stores, not boilerplate.
- `README.md` reflects reality per AGENTS.md living-doc rule.

**Non-Goals:**
- No auth flows (register/sign-in/sign-out) — those are R0 feature work, not skeleton.
- No rooms, DMs, messages, presence, unread, files — all deferred to later R0 changes.
- No CI, no tests beyond a trivial smoke check, no production Dockerfile hardening (multi-stage is used but not squeezed).
- No shadcn components generated beyond what the provider boilerplate needs; future changes add them on demand.
- No Centrifugo subscribe-proxy endpoint — channel ACL lands with the first real channel.

## Decisions

### D1. Single-repo Next.js app at the repository root, not a monorepo

`package.json`, `app/`, `prisma/`, etc. live at the root. Alternative considered: `apps/web` pnpm workspace. Rejected because the hackathon timeline and AGENTS.md submission rule (`docker compose up` from repo root) favor the flattest possible layout. Adding a workspace later is cheap; removing one mid-hackathon is not.

### D2. App container runs `next dev` with Turbopack by default, `next start` in prod profile

Compose defines the default `app` service with `command: pnpm dev` (or `npm run dev`) for fast iteration. A second profile `prod` can later run `next build && next start` — out of scope here but kept in mind. Rationale: the submission spec says the stack must run with `docker compose up`; it does not mandate a production build. Dev mode gives reviewers HMR and is strictly easier to debug. Turbopack is Next.js 15's default and is explicitly called out in AGENTS.md as the assumption.

### D3. Package manager: `pnpm`, pinned via `packageManager` field

Alternatives: `npm`, `yarn`. `pnpm` chosen for speed and the single `pnpm-lock.yaml` lockfile. Docker image uses `corepack enable` to avoid a global install step. If this causes friction we will fall back to `npm` — flagged as a low-cost reversal.

### D4. Prisma migrations auto-run on container boot

The `app` container's entrypoint runs `prisma migrate deploy` before `next dev`. Alternative: require the developer to run migrations manually. Rejected — it violates the "`docker compose up` with no manual steps" requirement. Risk: a broken migration blocks boot; mitigation is that R0-scaffold ships exactly one initial migration with a single table, so the blast radius is tiny.

### D5. Centrifugo configured via `centrifugo/config.json` mounted read-only

Centrifugo reads HMAC token secret and admin API key from the mounted config. The same values live in `.env` and are passed to the `app` service. Alternative: configure Centrifugo entirely via env vars. Chose a config file because Centrifugo's JSON config is its most documented path and lets us pin `allowed_origins`, `namespaces`, and `user_channel_boundary` without wrestling env var naming. `.env.example` documents every required variable.

### D6. JWT issuer for Centrifugo tokens: `jose` in a Next.js Route Handler

`POST /api/centrifugo/connect` signs a short-lived HS256 JWT with `sub` = user id (or `dev-<random>` in dev until auth lands) and returns `{ token }` to the browser. Alternatives: use Centrifugo's server-side `connect_proxy` (HTTP callback from Centrifugo to the app on each connect). Rejected for the skeleton because connection-token flow is simpler, has fewer moving parts, and is the approach `centrifuge-js` docs lead with. Subscribe-proxy / channel-token flow will be revisited when the first private channel ships.

### D7. Providers injected in `app/layout.tsx` via a client `Providers` component

A single `<Providers>` client component wraps `{children}` and hosts: `QueryClientProvider`, a `CentrifugoProvider` (owns one `Centrifuge` instance, connects on mount, disconnects on unmount), and lightweight Zustand stores consumed via hooks (no provider needed for Zustand). This keeps `layout.tsx` a server component and contains client-only state in one place. Alternative: co-locate providers at route-group layouts. Rejected — the providers are genuinely global; duplicating them per route group adds complexity for no benefit.

### D8. React Virtuoso, Zustand, TanStack Query installed but used only in a "hello-world" smoke component

The skeleton creates `components/providers.tsx` and a tiny `app/(debug)/stack-check/page.tsx` route that: fires a `useQuery` against `/api/health`, subscribes to a `skeleton:ping` Centrifugo channel, and renders one Virtuoso list of 100 ints. This is the smallest honest proof that every library is wired. It is deleted by the next change that adds real features — comment in the file flags this.

### D9. Docker image strategy: single-stage Node 20-alpine for now

The `Dockerfile` installs deps, copies source, runs `prisma generate`, and starts `pnpm dev`. No multi-stage production optimization yet — documented as a R4-polish task. The image is ~400 MB; acceptable for a hackathon and much simpler to debug than a slim multi-stage build.

### D10. Postgres 16, persisted to a named volume `pgdata`

Default DB name `chat`, user `chat`, password from env. `DATABASE_URL=postgresql://chat:chat@db:5432/chat?schema=public`. Port 5432 exposed to host for optional `psql` debugging — documented in README as "host access is optional; services talk over the compose network."

### D11. Live reload via bind-mounted source and an anonymous `node_modules` volume

The `app` service in `docker-compose.yml` bind-mounts the repo root into `/app` so that edits on the host trigger Next.js's Turbopack HMR inside the container. To prevent the host's (possibly missing or platform-wrong) `node_modules` from shadowing the image's, the service declares an **anonymous volume** at `/app/node_modules` and another at `/app/.next`. Next.js's dev watcher is told to use polling via `WATCHPACK_POLLING=true` and `CHOKIDAR_USEPOLLING=true` so file-change events propagate reliably on Docker Desktop (macOS/Windows/WSL2). Alternatives considered: (a) rebuilding the image on every change — rejected, unusable DX; (b) `docker compose watch` with sync rules — more modern but adds a Compose-version floor and a learning curve; we can migrate to it later without breaking the contract. The bind-mount is the canonical dev-container pattern and is the cheapest path to "edit file → see change in browser within ~1 s."

### D12. JSON structured logs everywhere via `pino`

All application logs — Next.js server, API route handlers, Prisma query logs, and the migrate-entrypoint script — emit a single JSON line per event. `pino` is the logger (fast, minimal, ecosystem-standard). `lib/logger.ts` exports a singleton `logger` with `level` sourced from `LOG_LEVEL` (default `info`), and base fields `{ service: 'app', env: NODE_ENV }`. In dev, we do **not** pipe through `pino-pretty` in the container — keeping JSON uniform across dev and prod means `docker compose logs app | jq` always works, log shippers never need a dev-vs-prod branch, and reviewers get the same shape that future observability (R5) will consume. Developers who want pretty output locally can pipe with `| pino-pretty` on the host. Alternatives considered: Next.js's default `console.*` — rejected, unstructured; `winston` — heavier and slower. Centrifugo's own logs are already JSON-friendly via its `log_level` config; Postgres logs stay in their native format (out of scope to reformat).

## Risks / Trade-offs

- [Postgres not ready when app tries to migrate] → `app` has `depends_on: { db: { condition: service_healthy } }` using Postgres's built-in `pg_isready` healthcheck, and the entrypoint retries `migrate deploy` twice with a 2 s backoff.
- [Centrifugo HMAC secret mismatch between config.json and app] → single source of truth is `.env`; Compose substitutes `${CENTRIFUGO_TOKEN_HMAC_SECRET}` into both the mounted config and the app env. `.env.example` has a dev-only default so `docker compose up` works without creating a `.env` first.
- [pnpm-in-Docker flakiness via corepack] → fallback plan is to switch to `npm` — low effort, all commands are invoked via `package.json` scripts.
- [Connection-token endpoint exposes a dev identity] → route checks `NODE_ENV !== 'production'` before issuing dev tokens; in production it returns 401 until real session cookies exist. This guardrail prevents a forgotten stub from shipping.
- [Auto-migrate on boot could corrupt a dev DB if two containers race] → only one `app` service is started by Compose; race is not possible in the stated topology.
- [Next.js 15 + React 19 peer-dep churn with shadcn/ui] → pin to shadcn's "new-york" template output known-good versions; if a primitive breaks, we regenerate it with `npx shadcn@latest add` — this change only installs the init, so the surface is small.
- [Bind-mount HMR misses events on Docker Desktop / WSL2] → enable `WATCHPACK_POLLING=true` and `CHOKIDAR_USEPOLLING=true`; accept the small CPU cost for reliability. If polling still misses, fall back to `docker compose watch` with explicit `sync` rules.
- [Host `node_modules` leaks into the container via bind-mount and breaks native deps] → declare anonymous volumes for `/app/node_modules` and `/app/.next` in the `app` service so the image's installed deps win over whatever the host may have.
- [JSON logs are hard to read during interactive debugging] → mitigated by documenting `docker compose logs -f app | pino-pretty` in the README; we refuse to diverge dev/prod log shapes.

## Migration Plan

There is no existing running system, so "migration" is really "first boot":

1. Developer clones repo, copies `.env.example` → `.env` (or skips — defaults work for dev).
2. `docker compose up --build` from repo root.
3. `db` comes up healthy → `centrifugo` comes up → `app` runs `prisma migrate deploy` then `next dev`.
4. Browser opens `http://localhost:3000` → landing page renders; `/stack-check` proves Query + Centrifuge + Virtuoso all work.
5. Rollback: `docker compose down -v` removes containers and the `pgdata` / `uploads` volumes. No data to preserve.

## Open Questions

- Do we ship a `prisma studio` compose profile? Leaning no for skeleton — add if a reviewer asks.
