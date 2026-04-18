## 1. Repository bootstrap

- [ ] 1.1 Add `package.json` at repo root with `name`, `private: true`, `packageManager: pnpm@<pinned>`, and scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `db:migrate`, `db:generate`, `db:studio`
- [ ] 1.2 Install runtime deps: `next@^15`, `react@^19`, `react-dom@^19`, `@prisma/client`, `@tanstack/react-query`, `zustand`, `centrifuge`, `react-virtuoso`, `jose`, `pino`, `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`
- [ ] 1.3 Install dev deps: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `prisma`, `tailwindcss`, `postcss`, `autoprefixer`, `eslint`, `eslint-config-next`, `pino-pretty`
- [ ] 1.4 Add strict `tsconfig.json` (`strict: true`, `paths` for `@/*` → root)
- [ ] 1.5 Add `.gitignore` covering `node_modules`, `.next`, `.env`, `prisma/*.db`, `uploads/`, `.pnpm-store`
- [ ] 1.6 Add `.env.example` with `DATABASE_URL`, `CENTRIFUGO_TOKEN_HMAC_SECRET`, `CENTRIFUGO_API_KEY`, `CENTRIFUGO_URL`, `NEXT_PUBLIC_CENTRIFUGO_WS_URL`, `SESSION_SECRET`, `UPLOADS_DIR`, `LOG_LEVEL` and safe dev defaults

## 2. Next.js app scaffold

- [ ] 2.1 Add `next.config.ts` (output: standalone disabled for dev, `experimental.typedRoutes` on)
- [ ] 2.2 Create `app/layout.tsx` (server component) and `app/globals.css` with Tailwind directives and shadcn CSS variables (neutral base)
- [ ] 2.3 Create `app/page.tsx` landing page with project name, short description, link to `docs/index.md`, link to `/stack-check`
- [ ] 2.4 Create `app/(debug)/stack-check/page.tsx` that renders a Virtuoso list of 100 ints, runs a `useQuery('/api/health')`, and surfaces Centrifugo connection status — include a TODO comment marking the file for deletion in the next change

## 3. Tailwind + shadcn/ui init

- [ ] 3.1 Add `tailwind.config.ts` with `content` paths for `app/**` and `components/**`, and the shadcn `new-york` theme tokens
- [ ] 3.2 Add `postcss.config.mjs`
- [ ] 3.3 Add `components.json` configured for App Router, `new-york` style, `@/components`, `@/lib/utils` aliases
- [ ] 3.4 Add `lib/utils.ts` exporting `cn()`

## 4. Prisma

- [ ] 4.1 Run `prisma init` to create `prisma/schema.prisma` with `provider = "postgresql"` and `url = env("DATABASE_URL")`
- [ ] 4.2 Add `User` model: `id String @id @default(cuid())`, `email String @unique`, `username String @unique`, `passwordHash String`, `createdAt DateTime @default(now())`
- [ ] 4.3 Generate the initial migration (`prisma migrate dev --name init`) and commit `prisma/migrations/**`
- [ ] 4.4 Add `lib/prisma.ts` exporting a global singleton `PrismaClient` (guarded against Next.js dev hot-reload)

## 5. Client providers

- [ ] 5.1 Add `components/providers.tsx` ("use client") wrapping children in `QueryClientProvider` with a shared `QueryClient` and sane defaults (`staleTime: 30_000`, `retry: 1`)
- [ ] 5.2 Add `lib/centrifuge.ts` exporting a `createCentrifuge()` factory that constructs a `Centrifuge` instance with a `getToken` callback hitting `/api/centrifugo/connect`
- [ ] 5.3 Inside `providers.tsx`, mount a single Centrifuge instance on mount and disconnect on unmount; expose it via a React context + `useCentrifuge()` hook
- [ ] 5.4 Add `lib/stores/connection-store.ts` — a small Zustand store holding Centrifugo connection state (`disconnected` | `connecting` | `connected`)
- [ ] 5.5 Wire `<Providers>` into `app/layout.tsx`

## 6. Centrifugo connect-token route

- [ ] 6.1 Add `app/api/centrifugo/connect/route.ts` (Node runtime) that POSTs a signed HS256 JWT using `jose`; in dev it mints `sub: dev-<random>`; in prod it returns 401 when no session cookie is present
- [ ] 6.2 Ensure the JWT's `exp` is ≤ 10 minutes from issuance and `aud`/`iss` match the Centrifugo config if set
- [ ] 6.3 Add `app/api/health/route.ts` returning `{ status: 'ok', db: 'up' }` on successful `SELECT 1`, `503 { status: 'degraded', db: 'down' }` on error
- [ ] 6.4 Add `lib/logger.ts` exporting a singleton `pino` logger with `level` from `LOG_LEVEL` (default `info`) and base fields `{ service: 'app', env: NODE_ENV }`; replace any `console.*` usage in server code with `logger.*`
- [ ] 6.5 Enable Prisma event logging piped through the `pino` logger (`new PrismaClient({ log: [...] })` with an `$on('query'|'warn'|'error')` forwarder)
- [ ] 6.6 Ensure the migrate-entrypoint script emits JSON log lines (e.g., via `node -e` using `pino`, or a tiny shell wrapper that wraps its output in a JSON envelope)

## 7. Centrifugo service configuration

- [ ] 7.1 Add `centrifugo/config.json` with `token_hmac_secret_key` referencing the env var, `api_key`, `allowed_origins: ["http://localhost:3000"]`, `admin: false`, and a default namespace config
- [ ] 7.2 Document in the config (via a top-level comment or README note) that the file is mounted read-only into the container

## 8. Docker

- [ ] 8.1 Add `Dockerfile` (Node 20-alpine) that installs pnpm via corepack, copies `package.json`/`pnpm-lock.yaml`, runs `pnpm install --frozen-lockfile`, copies source, runs `pnpm exec prisma generate`, and defaults to `pnpm dev`
- [ ] 8.2 Add entrypoint script (or `command:` in compose) that runs `pnpm exec prisma migrate deploy` with up to 2 retries and a 2 s backoff, then starts `next dev`
- [ ] 8.3 Add `.dockerignore` covering `node_modules`, `.next`, `.git`, `.env`, `uploads/`
- [ ] 8.4 Add `docker-compose.yml` at repo root with services `db` (postgres:16-alpine, healthcheck via `pg_isready`, named volume `pgdata`, port 5432 exposed), `centrifugo` (centrifugo/centrifugo:v5, mounts `centrifugo/config.json`, port 8000 exposed, env from `.env`), and `app` (builds from `./Dockerfile`, `depends_on: { db: { condition: service_healthy }, centrifugo: { condition: service_started } }`, env from `.env`, port 3000 exposed)
- [ ] 8.5 Configure live reload on the `app` service: bind-mount repo root to `/app`, declare anonymous volumes for `/app/node_modules` and `/app/.next`, and set `WATCHPACK_POLLING=true` and `CHOKIDAR_USEPOLLING=true` in its environment
- [ ] 8.6 Declare named volumes `pgdata` and `uploads` (the latter reserved for R1)

## 9. README

- [ ] 9.1 Update `README.md` "Setup & running locally" with `docker compose up` as the only required command; document ports (`3000`, `5432`, `8000`) and mention `.env.example` is optional
- [ ] 9.2 Update "Environment variables" to mirror `.env.example` exactly
- [ ] 9.3 Update "Development workflow" with `pnpm dev`, `pnpm db:migrate`, `pnpm lint`, `pnpm typecheck`
- [ ] 9.4 Update "Repository layout" to list the new top-level files/dirs
- [ ] 9.5 Tick "R0 scaffold complete" and refresh the Status line

## 10. Verification

- [ ] 10.1 From a fresh clone with no `.env`, `docker compose up --build` boots all three services to a running state
- [ ] 10.2 `http://localhost:3000/` returns 200 and renders the landing page
- [ ] 10.3 `http://localhost:3000/api/health` returns `{ status: 'ok', db: 'up' }`
- [ ] 10.4 `http://localhost:3000/stack-check` shows Virtuoso rendering, Query result, and Centrifugo `connected` state within 5 seconds
- [ ] 10.5 Editing `app/page.tsx` on the host updates the browser via HMR without restarting the container
- [ ] 10.6 `docker compose logs app | head` returns lines that each parse as JSON (validated with `jq -c .`)
- [ ] 10.7 `pnpm typecheck` and `pnpm lint` pass with zero errors
- [ ] 10.8 `openspec validate scaffold-app-skeleton --strict` passes
