## Why

The repository currently contains only docs and OpenSpec tooling — there is no runnable code, no `docker-compose.yml`, no Next.js app, and no database schema. Every subsequent release (R0 MVP and beyond) depends on a working baseline stack that starts with a single `docker compose up`. This change establishes that foundation so feature work can land on top without reshuffling infrastructure.

## What Changes

- Add a repo-root `docker-compose.yml` that boots three services: `app` (Next.js 15 + TypeScript), `db` (PostgreSQL 16 with a named volume), and `centrifugo` (v5 with HMAC-token config). A named volume for local file uploads is declared but unused until R1.
- Scaffold a Next.js 15 App Router application in TypeScript at the repo root with strict TS config, Tailwind CSS, and shadcn/ui initialized (primitives not generated yet — just the config, `components.json`, and theme tokens).
- Add Prisma with an initial `schema.prisma` containing only a placeholder `User` model (email unique, username unique+immutable-by-convention, passwordHash, createdAt) so migrations run on boot and later changes just add models.
- Wire the core client libraries as **providers only**, with no feature code: TanStack Query provider, Zustand store skeleton, and a thin `centrifuge-js` client factory reading from env. React Virtuoso is installed as a dependency.
- Add a signed Centrifugo connection-token route (`POST /api/centrifugo/connect`) returning a JWT for the current session; returns 401 when unauthenticated so the shape is correct even before auth lands. No channel-subscribe proxy yet.
- Add `.env.example` listing `DATABASE_URL`, `CENTRIFUGO_TOKEN_HMAC_SECRET`, `CENTRIFUGO_API_KEY`, `CENTRIFUGO_URL`, `NEXT_PUBLIC_CENTRIFUGO_WS_URL`, `SESSION_SECRET`, `UPLOADS_DIR`.
- Add a landing page (`/`) and a stub `/health` route so reviewers can verify the stack is up; update `README.md` per AGENTS.md living-doc rules to document the real `docker compose up` workflow, ports, and env vars.

## Capabilities

### New Capabilities
- `app-skeleton`: the runnable baseline — Compose orchestration, Next.js app boot, Prisma + Postgres connectivity, Centrifugo reachability with a signed connect token, and the client-side provider wiring (TanStack Query, Zustand, centrifuge-js factory, Virtuoso installed) that every future capability plugs into.

### Modified Capabilities
<!-- None — there are no existing specs yet. -->

## Impact

- New top-level files: `docker-compose.yml`, `.env.example`, `next.config.ts`, `tsconfig.json`, `package.json`, `tailwind.config.ts`, `postcss.config.mjs`, `components.json`, `prisma/schema.prisma`, `Dockerfile` (for `app`), `centrifugo/config.json`.
- New directories: `app/` (Next.js App Router), `lib/` (prisma client, centrifugo server helpers, query client), `components/` (providers only).
- New dependencies: `next@^15`, `react@^19`, `react-dom@^19`, `typescript`, `@types/*`, `prisma`, `@prisma/client`, `tailwindcss`, `@tanstack/react-query`, `zustand`, `centrifuge`, `react-virtuoso`, `jose` (for Centrifugo JWT), plus shadcn/ui peer deps.
- Affects: `README.md` (living doc), AGENTS.md-referenced workflow (`docker compose up` must now actually produce a running stack).
- No existing code is modified — there isn't any yet.
