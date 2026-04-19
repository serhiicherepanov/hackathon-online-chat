# Agent guidance — online chat (hackathon)

This repository implements a **classic web chat**: rooms (public/private), DMs, contacts, files/images, moderation, presence, and **~300 concurrent users**. Authoritative spec: **[`REQUIREMENTS.md`](REQUIREMENTS.md)** → **[`docs/index.md`](docs/index.md)** (all sections). Phased delivery plan: **[`docs/plan/index.md`](docs/plan/index.md)** (R0 MVP → R5 advanced stretch).

**Runtime:** **Docker Compose** orchestrates **all** services (e.g. Next.js app, PostgreSQL, Centrifugo, and any supporting containers). Local development and submission both assume **`docker compose up`** from the repo root—not a mix of bare-metal DB and containerized app.

## Branching policy

**Every feature and every release/phase (R0, R1, …) must be developed on its own dedicated branch off `master`** — never commit feature or phase work directly to `master`.

- Phase branches: `release/r<N>-<short-slug>` (e.g. `release/r1-rich-messaging`).
- Feature branches: `feature/<short-slug>` (e.g. `feature/emoji-picker`), branched from the active phase branch when the feature belongs to a phase, otherwise from `master`.
- Bugfix branches: `fix/<short-slug>`.
- One logical change per branch; keep branches short-lived and rebase on the parent branch before opening a PR.
- Merge back via PR only — no direct pushes to `master` or to an active phase branch once it has downstream feature branches.
- If you find yourself on `master` with uncommitted feature/phase work, stop and move the work to a new branch before committing.

### Agents must never touch the default branch directly

`master` (the repository's default branch) is **protected** and agents have
**zero** write authority over it. This is non-negotiable and applies even
when the tooling appears to permit it:

- **Never `git push` to `master`** (neither regular push nor `--force` /
 `--force-with-lease`). Not to fix a typo, not to land a "trivially safe"
 revert, not ever.
- **Never run `gh pr merge`** (nor any other merge/admin-merge command)
 against a PR targeting `master`. Merging is a human decision. Even if
 `gh pr merge --auto` reports success because branch protection is
 mis-configured, that is still a policy violation — the failure is the
 action you took, not the policy that didn't catch you.
- **Never run `git merge` / `git rebase` / `git reset` that writes to
 `master`**, local or remote. Local `master` should only ever move via
 `git pull --ff-only` from `origin/master`.
- If you realize you have just pushed to or merged into `master`, **stop**
 and open a revert PR from a new branch. Do not try to "quickly fix" it
 with another direct push — that compounds the mistake.

The correct end-of-task flow is always the same:

1. Commit work on a feature / phase / fix branch.
2. `git push -u origin <branch>`.
3. `gh pr create` targeting `master`.
4. **Stop.** Report the PR URL to the user. A human reviews and merges.

If the user says "merge it" or "ship it", interpret that as "open the PR
and enable auto-merge if you have permission **and** the branch protection
allows it". If branch protection does not gate the merge, still do not
press the button — ask the user to confirm they want you to merge a PR
that targets the default branch, and default to "no" on ambiguity.

## Pre-flight: typecheck and real modules

Do this **before** you treat a change as done, push, or rely on CI—otherwise you can merge **broken imports** (e.g. `TS2307: Cannot find module '@/lib/…'`) when a route or script references a file that was never added, or a task checklist was ticked without the file existing on disk.

- **Run `pnpm typecheck`** (`tsc --noEmit`). It catches missing modules, missing exports, and many bad call signatures in one pass. Prefer running it after any edit that adds imports or new files.
- **Imports must resolve in the repo**: every new `@/…` path or relative import must point to a file that exists in the **same branch/commit** as the caller. Do not wire `app/api/…`, `scripts/*.ts`, or tests to a module that only appears in OpenSpec/tasks or narrative docs.
- If you add a **shared helper** (`lib/…`), add the **`.ts` file in the same change** as the first import—never leave consumers pointing at a path you “will add next.”
- When you touch **pure logic** or new components, also run **`pnpm test`** (see Testing below); CI runs typecheck + unit tests together.

## Regression discipline: logic changes must update tests

When a change modifies **user-visible behavior, API contracts, validation, or
gating rules** (auth, authz, friendship gates, block rules, presence
semantics, message/DM visibility, rate limits, error shapes), it **must** also
update every pre-existing unit/e2e test that exercises the old behavior in
the **same commit/branch**.

- Before you say "done", `rg` for callers of the changed endpoint/helper
 across `e2e/`, `app/`, `lib/`, and `openspec/` and adjust them. A green CI
 on master is the contract; do not leave red tests for "the next phase".
- Typical trap: a later phase tightens a rule (e.g. R2 added the
 friendship-gate on `POST /api/dm/:username` → returns 403 for strangers).
 Every earlier e2e that opened DMs between freshly-registered users must
 either (a) establish the required precondition via the real API (e.g.
 `befriendContexts(ctxA, ctxB)` in `e2e/helpers/social.ts`) or (b) use an
 explicit test seam documented in this file. Do **not** keep the assertion
 that "strangers can DM" if the spec now says otherwise.
- Test-only workarounds (hand-crafted DB inserts, bypass flags, "e2e mode"
 env vars) are a last resort and must be called out in the PR description.
 Prefer driving the real API.
- When a fix regresses a previously-passing test, **do not disable or skip
 the test**. Either fix the underlying issue or update the test to match
 the new, intentional behavior — and document the reason inline.

## Critical rules (from requirements)

These are non-negotiable constraints agents must respect; details live in linked docs.

**Delivery & scale**

- **~300 simultaneous users**; a single room **up to 1000 participants**; a user may join **unlimited** rooms (sizing hint: ~20 rooms, ~50 contacts).
- After send, messages should reach recipients **within 3 seconds**; presence updates **under 2 seconds**.
- UI must stay usable with **very large history** (spec calls out **at least 10,000 messages** in a room, and long-lived rooms can reach **~100,000 messages**)—use pagination + Virtuoso, support **progressive scroll-up to the earliest message**, and cover this path with an automated test.

**Transport & presence design caveats**

- Do **not** fan out live messages via REST polling — with rooms of 100+ users that collapses. Use Centrifugo (WebSocket) for live delivery, typing, and presence.
- Do **not** push *everything* over WebSockets either — history pages, auth, CRUD, and uploads stay on REST / Server Actions. The expected shape is **REST for request/response + WebSocket for live updates**.
- Presence/activity is driven by a client **heartbeat** emitted only while the user is genuinely interacting (mouse move / key / touch within the last 1–2 s). The server infers **AFK / offline from the *absence* of heartbeats** — browsers hibernate inactive tabs and stop JS, so the client cannot be trusted to send an "I went away" signal.

**Persistence & history**

- Messages **persist for years**; load older history via **infinite scroll** (not one giant fetch).
- **Consistency** must hold for: membership, room bans, file access rights, message history, admin/owner permissions.

**Files**

- Store uploads on the **local file system**; **max 20 MB** per file, **max 3 MB** per image.

**Sessions & presence**

- **No** forced logout from inactivity; **login persists** across browser close/reopen; app must work with **multiple tabs** for the same user.
- **Offline** only when **no** open tabs with the app; with several tabs, **online if any tab is active**; **AFK only when every tab has been idle for more than 1 minute**; **sign out** ends **this browser session only** (other sessions stay valid).
- Offline recipients: messages are **stored and shown** when they connect next.

**Domain invariants (samples)**

- **Email** and **username** unique; **username immutable**; **room names** unique.
- **Personal dialogs**: exactly **two** participants; PM only between **friends** with **no user-to-user ban**; after a ban, **existing DM history stays visible but frozen/read-only**.
- **Room deletion** removes **all** its messages and attachments **permanently**. Losing **room access** removes access to its messages and files; **files remain** after upload if the uploader later loses access **unless the room is deleted**.
- UX should feel like a **classic web chat**, not a modern social/collab product.

**Submission**

- Project **must** be buildable and runnable with **`docker compose up`** from the **repository root** (see [`docs/requirements/submission.md`](docs/requirements/submission.md)).

## Stack (authoritative)

| Layer | Choice |
|--------|--------|
| App | **Next.js 15+** (App Router), **TypeScript** (Compose service) |
| UI | **shadcn/ui** (Tailwind CSS + Radix UI primitives) |
| Real-time server | **Centrifugo** (Compose service; WebSocket / SSE) |
| Real-time client | **centrifuge-js** |
| Database | **PostgreSQL** (Compose service) |
| ORM | **Prisma** |
| Client global state | **Zustand** (chat UI + membership/presence-style state that must be fast and local) |
| Server/async data | **TanStack Query** (REST/Server Actions responses; **paginated message history**) |
| Long lists | **React Virtuoso** (virtualize message threads and other large lists) |

**Note:** Development and production builds use **Next.js tooling** (e.g. Turbopack in dev). Do not assume **Vite** unless the project adds it explicitly (e.g. Vitest). Prefer aligning with the Next.js defaults already in `package.json` when it exists.

## Architectural boundaries

1. **Persistence and business rules** live in **Next.js** (Route Handlers, Server Actions, or a dedicated API layer) backed by **PostgreSQL + Prisma**.
2. **Live delivery** (typing, presence, new message fan-out, subscriptions) goes through **Centrifugo**; the browser uses **centrifuge-js** to subscribe/publish per your channel design. All real-time transport is Centrifugo-based — no XMPP/Jabber or alternate protocols. The R5 stretch (see plan) scales Centrifugo horizontally with a Redis engine and adds a bot/integration HTTP API, rather than introducing a different protocol.
3. **TanStack Query** owns **fetched, cacheable** data: message history pages, room lists, user profiles, etc. Use stable query keys; invalidate or append on mutations and when Centrifugo signals new data.
4. **Zustand** owns **high-churn or UI-coordination** state: active room, connection status, ephemeral notifications, merged “live + loaded” message view if needed—avoid duplicating server truth without a clear rule for reconciliation.
5. **Lists**: render message and other long scroll regions with **React Virtuoso**; avoid mounting thousands of DOM nodes for chat history.

## Conventions

- **TypeScript** everywhere in app code; strict types for Prisma models and Centrifugo payload shapes.
- **shadcn/ui**: compose primitives; keep tokens in Tailwind theme, avoid one-off inline styles for the same patterns.
- **Environment**: document required vars (e.g. `DATABASE_URL`, Centrifugo HTTP API / WebSocket URLs, tokens) in `.env.example` when adding features—never commit secrets.
- **Docker Compose**: Define **every** runtime dependency in Compose (app, DB, Centrifugo, volumes for Postgres data and **local file uploads** per spec). Root `docker compose up` must yield a runnable stack per submission rules; service names, ports, and internal URLs must match **Prisma** (`DATABASE_URL`), **Next.js**, and **centrifuge-js** connection settings (use `.env.example`; document hostnames for inter-container networking).
- **Two compose files, kept in sync**: the repo ships **two self-contained** compose files — `docker-compose.yml` (development default: `next dev` + HMR + source bind-mount, `development` Dockerfile target) and `docker-compose.prod.yml` (production: `production` Dockerfile target built with `NEXT_PUBLIC_*` as build `ARG`s, no source mount, `NODE_ENV=production`). They are **separate files, not overlays** — each one must be runnable on its own with a single `-f`, because some deployment environments (and the hackathon submission flow) only accept a single compose file at a time. This means any service-level change (new service, changed port, new env var, new healthcheck, new Traefik label, new volume, service-name rename, dependency order) **must be applied to both files in the same commit**. Drift between the two is a bug: dev passes, prod silently breaks (or vice versa). Things that legitimately differ between the two — and must stay different — are: `build.target`, `build.args` for `NEXT_PUBLIC_*`, the `app` service's `volumes:` (source mount + dev caches in dev only), `NODE_ENV`, file-watcher polling env vars, and the use of `${VAR:?...}` on secrets in prod (fail fast on missing config) vs. dev-friendly defaults in dev. When adding a service, use the dev file as the source of truth, then port the service block into the prod file adjusting only those allowed-to-differ knobs.
- **Error boundaries**: wrap risky client subtrees with React error boundaries so a single failure never blanks the whole chat. Use Next.js App Router `error.tsx` files at route segments (app root, `(chat)/layout`, per-room view, settings) and component-level boundaries (e.g. `react-error-boundary`) around:
  - the **Centrifugo-connected** realtime provider (connection/subscription failures must not crash the shell),
  - the **Virtuoso message list** and message renderers (bad payloads, missing attachments, markdown/emoji render errors),
  - **file/image previews and uploads** (corrupt files, network errors, permission loss),
  - **TanStack Query** consumers that throw on error (`useQuery({ throwOnError: true })` / `useSuspenseQuery`) — pair each with a boundary + `QueryErrorResetBoundary` so "Retry" actually refetches,
  - third-party/embeddable widgets (link previews, code highlighting, audio/video players).

  Boundary UIs must show a short human message, a **Retry** action that resets the boundary (and refetches queries where relevant), and log via a single `reportError(err, context)` helper. Keep boundaries **scoped** — don't wrap the entire app in one giant boundary; the sidebar, active room, and composer should fail independently. Server Components and Server Actions use Next.js error files / `try/catch` instead, not React boundaries.

## Interacting with the Docker Compose stack

The whole app runs in Compose — **never** install Postgres, Centrifugo, or Node locally to "just run a script". Run everything through `docker compose`. Commands below assume you're in the repo root and using the dev file (`docker-compose.yml`); swap in `-f docker-compose.prod.yml` for the prod variant.

Before environment-sensitive work (Docker, Prisma, Postgres, Centrifugo, Playwright, migrations, or runtime debugging), re-read this section and follow it instead of falling back to host-only shortcuts.

**Services** (names used with `exec` / `logs` / `run`): `traefik`, `db` (Postgres 16), `centrifugo`, `app` (Next.js).

**Exposed entrypoint:** everything reaches the browser through Traefik at `http://localhost:${TRAEFIK_BIND_PORT:-3080}`. `db` and `centrifugo` are **not** published on the host — reach them via `docker compose exec` or from inside `app`.

### Lifecycle

- **Bring the stack up (dev, with build):** `docker compose up -d --build`
- **Wait until healthy:** `./scripts/wait-for-health.sh http://localhost:3080 120` (polls `/api/health`).
- **Status / ports:** `docker compose ps`
- **Tail logs for one service:** `docker compose logs -f --tail=200 app` (or `db` / `centrifugo` / `traefik`). Prefer `--since=1m` over `-f` when scripting.
- **Rebuild just the app image after `package.json` / `Dockerfile` changes:** `docker compose build app && docker compose up -d app`
- **Tear down + wipe volumes (fresh DB, uploads):** `docker compose down -v --remove-orphans`

Do not `docker compose restart app` after editing source in dev — the dev compose bind-mounts the repo and `next dev` hot-reloads. Restart only after dependency / Dockerfile / env changes.

### Running commands inside the app container

Use `docker compose exec app …` for an already-running stack, or `docker compose run --rm app …` for one-shot tasks before the stack is up. The workdir is `/app`, matching the repo root.

- **Shell:** `docker compose exec app sh`
- **Arbitrary pnpm script:** `docker compose exec app pnpm <script>` — e.g. `pnpm typecheck`, `pnpm test`, `pnpm lint`.
- **Ad-hoc TypeScript script:** `docker compose exec app pnpm tsx scripts/<name>.ts` (e.g. `scripts/gc-staged-uploads.ts`).
- **One-shot before stack is up:** `docker compose run --rm app pnpm tsx scripts/<name>.ts`.

### Prisma (migrations, client, studio, seed)

Always run Prisma inside the `app` container — it reads `DATABASE_URL` from the compose env and resolves `db:5432` via the internal network.

- **Apply pending migrations (prod-style, non-interactive):** `docker compose exec app pnpm db:migrate` (`prisma migrate deploy`).
- **Create a new migration from schema changes (dev, interactive):** `docker compose exec app pnpm db:migrate:dev --name <slug>`.
- **Regenerate the Prisma client after schema edits:** `docker compose exec app pnpm db:generate` (runs automatically on `pnpm install` via `postinstall`).
- **Prisma Studio:** `docker compose exec app pnpm db:studio` — then port-forward `5555` if you need browser access (`docker compose exec` already streams it; or publish it temporarily in a local override).
- **Reset DB to empty + re-run migrations:** `docker compose exec app pnpm prisma migrate reset --force` (destroys data — dev only).

If a migration partially failed and left the DB dirty, prefer `docker compose down -v` to drop the `db` volume entirely over hand-editing `_prisma_migrations`.

### Database (Postgres)

The `db` service runs Postgres 16 with user/db `chat` / `chat` (see `.env.example`).

- **psql shell:** `docker compose exec db psql -U chat -d chat`
- **One-off SQL:** `docker compose exec -T db psql -U chat -d chat -c "SELECT count(*) FROM \"User\";"`
- **Dump:** `docker compose exec -T db pg_dump -U chat chat > test-artifacts/db.sql`
- **Restore into a fresh DB:** `docker compose exec -T db psql -U chat -d chat < test-artifacts/db.sql`

### Centrifugo

Centrifugo's admin HTTP API is on the internal network at `http://centrifugo:3080` and requires `Authorization: apikey ${CENTRIFUGO_API_KEY}`.

- **Presence on a channel:** `docker compose exec app wget -qO- --header="Authorization: apikey $CENTRIFUGO_API_KEY" --post-data='{"channel":"room#<id>"}' http://centrifugo:3080/api/presence`
- **Global stats:** `docker compose exec app wget -qO- --header="Authorization: apikey $CENTRIFUGO_API_KEY" http://centrifugo:3080/api/info`
- **Config lives in** `centrifugo/config.json`; restart with `docker compose restart centrifugo` after editing.

### Uploads and local files

Uploads go to `UPLOADS_DIR=/app/uploads` inside the container (Compose volume). To inspect: `docker compose exec app ls -lah /app/uploads`. To wipe between test runs, `docker compose down -v` (the uploads volume goes with it) — never `rm -rf` from the host.

### When NOT to `docker compose exec`

- **Fast unit tests / typecheck during local iteration:** `pnpm test` / `pnpm typecheck` on the host is fine if you have Node + pnpm installed — they don't need the DB or Centrifugo. The canonical CI path still runs them through the container.
- **E2E / Playwright:** do **not** call `pnpm exec playwright test` directly. Use `./scripts/ci-e2e.sh` (brings the stack up, waits, runs Playwright, tears down). See Testing below.

## Testing

The repo uses **Vitest** + **React Testing Library** + **jsdom** for unit tests. Tests are **colocated** next to the code they cover (`foo.ts` ↔ `foo.test.ts`, `Button.tsx` ↔ `Button.test.tsx`). No separate `__tests__/` tree.

Scripts:

- `pnpm test` — run the full Vitest suite once (CI-friendly).
- `pnpm test:watch` — watch mode while developing.
- `./scripts/ci-e2e.sh` — full end-to-end pipeline: preflights the environment, brings up the Compose stack, waits for `/api/health`, runs Playwright, and tears the stack down while dumping logs to `test-artifacts/`. **This is the canonical way to run e2e locally** — do not invoke `pnpm exec playwright test` directly against a half-wired stack. Useful env knobs: `KEEP_STACK=1` (leave the stack running for debugging), `HEADED=1` / `DEBUG=1` / `UI=1` (require a DISPLAY), `E2E_ARGS="-g 13.2"` (forward args to Playwright, e.g. to run a single test — keep the value whitespace-free, it is word-split).

**E2E runs against the production build, not `next dev`.** `ci-e2e.sh` uses `docker-compose.prod.yml` with a dedicated `--env-file .env.e2e` (gitignored; `scripts/ci-e2e.sh` seeds it from the committed `.env.e2e.example` on first run), so the pipeline never touches a developer's local `.env`, and Next.js serves precompiled routes instantly. This matters because:

- **Per-test timeout is 10 s** (`playwright.config.ts` `timeout: 10_000`, `expect.timeout: 5_000`). A healthy e2e test against the prod build should finish in **a few seconds**, rarely more than 20–30 s even on cold paths. If a test of yours needs more, the test is wrong, not the budget — don't add `test.setTimeout(...)` overrides to paper over dev-mode JIT or flaky waits.
- **Do not introduce a `next dev` path into e2e.** Dev mode compiles each route on first access (10–20 s per route) and will blow the 10 s budget on the first navigation of every test.
- **`.env.e2e.example` is the single source of truth for e2e config.** Add any new required env var there alongside `.env.example`, keep values self-consistent with `docker-compose.prod.yml`, and never read the developer's `.env` from test code. The live `.env.e2e` is gitignored — only the `.example` template is committed so secret-scanners (GitGuardian, etc.) don't flag the repo.
- **Usernames must be ≤ 32 chars** (validator rule). The `makeUsers(prefix)` helper composes `alice_${prefix}_${timestamp}_${rand7}`; keep `prefix` ≤ 4 chars (e.g. `t132`, `r2fr`) or registration will fail the Zod check before you see the first real assertion.
- **Compose v5 bake bug workaround lives in `ci-e2e.sh`**: the script pre-builds the `production` image with `DOCKER_BUILDKIT=0 docker build` and then `docker compose up --no-build`. Do not replace it with `docker compose up --build` without verifying v5 no longer panics in `build_bake.go` on every supported host.

**Always run tests with a hard timeout and tee the output to a log file.** Test
commands (unit, e2e, `ci-*.sh`, `playwright test`, `vitest run`, anything that
exercises the stack) can hang on a bad stack, a stuck browser, or a frozen
Next.js dev server. A runaway command blocks the whole agent loop and wastes
tool-call budget. The required shape is:

```bash
timeout <seconds> <test-command> 2>&1 | tee test-artifacts/<run>.log | tail -n 5
```

Pick a realistic timeout (e.g. `60` for unit tests, `300`–`420` for the full
Playwright suite against the prod build, `900` for `./scripts/ci-e2e.sh`
including the one-time `docker build` of the production image plus compose
up/down).
`test-artifacts/` is already gitignored and is where CI uploads logs — reuse
it. `| tail -n 5` keeps the assistant response short; the full output stays on
disk for follow-up reads (`Read` on the log, `rg` for failures, etc.). Never
run a test command without `timeout` and without capturing output to a file.

**Do not skip required e2e verification.** If a change affects UI flows, realtime
behavior, Docker/Prisma-backed integration, acceptance criteria, or adds/changes
an OpenSpec e2e task, add the relevant end-to-end coverage and run it with the
canonical stack-backed command:

```bash
timeout <seconds> env E2E_ARGS="<target>" ./scripts/ci-e2e.sh 2>&1 | tee test-artifacts/<run>.log | tail -n 5
```

Use `E2E_ARGS` to target a single spec or grep when appropriate, but do not mark
an e2e-related task complete or imply end-to-end verification happened unless the
test was both added and run successfully. If e2e is blocked by environment or
infrastructure issues, say so explicitly, keep the task unchecked, and report the
exact blocker instead of silently skipping it.

### Iterating on a single e2e test (fast local loop)

`./scripts/ci-e2e.sh` does the full pipeline — `docker build` of the production
image (~60–120 s cold), compose up, health wait, Playwright run, compose down,
log dump. That's the right signal for "is this branch green?" but it's far too
expensive when you're iterating on one flaky test or debugging a selector. For
the fast loop, pay the setup cost **once** and then re-run Playwright directly
against the still-running prod stack:

1. **Warm the stack once**, pinning to a cheap single test so the script
 builds + boots and leaves everything running:

 ```bash
 KEEP_STACK=1 timeout 900 env E2E_ARGS="-g 13.6" ./scripts/ci-e2e.sh \
   2>&1 | tee test-artifacts/e2e-warm.log | tail -n 5
 ```

 `KEEP_STACK=1` skips `docker compose down` on exit; the stack stays up on
 `http://localhost:3080`. `-g 13.6` runs just one short test so the warm-up
 finishes in seconds after the build — pick any fast test you have. On a
 subsequent warm-up the Docker layer cache makes the build nearly free.

2. **Iterate** without touching the script. Because the stack is already up
 and healthy, call Playwright directly and target exactly what you care
 about. Set `PLAYWRIGHT_BASE_URL` so the config picks up the running prod
 app:

 ```bash
 timeout 120 env PLAYWRIGHT_BASE_URL=http://localhost:3080 \
   pnpm exec playwright test -g "13.2 public room" \
   2>&1 | tee test-artifacts/e2e-one.log | tail -n 5
 ```

 Each iteration is bounded by the single-test budget (`timeout: 10_000` in
 `playwright.config.ts`) — typically 2–10 s instead of the 150+ s a full
 `ci-e2e.sh` invocation costs.

3. **After editing app code**, rebuild + recreate only the `app` container.
 Do not restart the whole stack or rebuild from scratch:

 ```bash
 docker compose -p hackathon-online-chat \
   -f docker-compose.prod.yml --env-file .env.e2e \
   build app
 docker compose -p hackathon-online-chat \
   -f docker-compose.prod.yml --env-file .env.e2e \
   up -d app
 ./scripts/wait-for-health.sh http://localhost:3080 60
 ```

 Then re-run step 2. The `-p hackathon-online-chat` flag pins the compose
 project name so the tag matches what `ci-e2e.sh` built in step 1, even
 when you're in a git worktree whose directory name is not
 `hackathon-online-chat`.

4. **Tear the stack down** when you're done:

 ```bash
 docker compose -p hackathon-online-chat \
   -f docker-compose.prod.yml --env-file .env.e2e \
   down -v --remove-orphans
 ```

Rules of thumb for this loop:

- **Never run Playwright against `next dev`** even for one test. Dev-mode
 lazy route compilation eats 10–20 s on first navigation and will blow the
 10 s per-test budget; tests that pass in this mode are not real signal.
 If you need to work on a route interactively, use `docker compose up -d`
 (the dev file) in a browser — not in Playwright.
- **Do not edit `playwright.config.ts` timeouts** to make the fast loop
 "work" against a slow stack. The 10 s budget is load-bearing against the
 production build; extending it hides regressions.
- **This loop is for iteration, not for sign-off.** Before you declare an
 e2e-related change done, run the full canonical command from the previous
 section at least once so you exercise the same cold-build path CI does.
- If you only need to click through flows manually (not in Playwright
 specs), drive the warm stack with the Playwright MCP tool per the
 "Debugging a failing e2e / UI issue" section below — that's the fastest
 way to eyeball a selector or reproduce a race.

What to test (in order of priority):

1. **Pure logic** — Zod schemas in `lib/validation/`, helpers in `lib/utils.ts`, presence/transition reducers in `lib/presence/`, access-check helpers in `lib/conversations/`. These are fast, deterministic, and catch most regressions.
2. **Zustand stores** (`lib/stores/*`) — exercise them by calling `store.getState().action(...)` and asserting `store.getState()`. Reset with `store.setState({...initial})` in `beforeEach` so tests don't leak state.
3. **React components** — render with `@testing-library/react`, interact with `@testing-library/user-event`, query by **role/name** (not class names or test-ids) whenever possible. Focus on behavior reachable to the user: labels, enabled/disabled, what fires on click, what renders when props change.

What **not** to test here:

- Next.js **route handlers**, **Server Actions**, and anything that reaches Prisma, Centrifugo, or the filesystem — those are integration/e2e concerns, not unit tests. Don't stub Prisma just to assert SQL; prefer end-to-end smoke tests via Playwright MCP against the running Compose stack.
- Full page renders that require the App Router, `cookies()`, `headers()`, or real network. Break the unit out (pure function or small client component) and test that instead.
- Snapshot tests of large component trees — they rot fast and don't encode intent.

Conventions:

- Use `vi.fn()` for spies; never mock a module you also want to import real.
- Components that rely on `centrifuge-js`, `next/navigation`, or TanStack Query should accept their dependencies as props or through a provider you can swap in tests, rather than importing singletons at module scope.
- Keep each test file focused on one unit; if setup grows past ~15 lines, the unit is probably doing too much.
- Any change that adds new pure logic or a new reusable component **must** ship with tests in the same change.

## Shell scripts

Every `*.sh` in this repo (under `scripts/`, `docker/`, or anywhere else) must
pass **ShellCheck** cleanly — no warnings, no errors, no blanket disables.

Conventions for shell scripts:

- Start every script with `#!/usr/bin/env bash` and `set -euo pipefail`.
- Lint before committing: `shellcheck scripts/*.sh docker/*.sh` (install via
  `apt install shellcheck`, `brew install shellcheck`, or your distro's
  equivalent).
- If ShellCheck flags something that's genuinely a false positive, add a
  narrowly-scoped `# shellcheck disable=SCxxxx` directly above the offending
  line with a one-line comment explaining why. Never disable rules at the
  file level and never disable `SC2086` (unquoted variables) globally.
- CI runs shell scripts on Ubuntu with `bash`; don't rely on zsh/fish
  extensions or macOS-only flags. Prefer POSIX-portable idioms where
  possible, but `bash`-only features (arrays, `[[ ... ]]`) are fine because
  the shebang pins bash.
- Scripts invoked from CI (`scripts/ci-*.sh`) must exit non-zero on the first
  real failure — never silence errors with `|| true` except in cleanup/trap
  paths where the failure is expected and logged.

When adding a new script, run `shellcheck` locally and fix every finding
before opening a PR.

## Keep `README.md` in sync with reality

[`README.md`](README.md) is a **living document** and must always reflect the **actual** state of the repo, not the planned state. Any change that alters how a contributor sets up, configures, or runs the app **must update `README.md` in the same change**. Concrete triggers:

- First `docker-compose.yml` lands → fill the **Setup & running locally** section with real commands, service URLs, and exposed ports.
- First `.env.example` lands or any variable is added/renamed → update the **Environment variables** section to match exactly.
- Next.js app scaffolded / `package.json` scripts added or changed → update the **Development workflow** section (dev server, Prisma migrate, lint/test commands).
- A release (R0, R1, …) is completed → tick it off in the **Release plan** table and refresh the **Status** line near the top.
- A new top-level directory, tool, or required runtime port is introduced → reflect it in **Repository layout** and the setup/env sections.
- A feature is removed or scope is cut → remove or annotate the corresponding claim in the README.

Rules of thumb:

- Do **not** defer README updates to a later change. If the code isn't real yet, the README section must say so with an explicit placeholder ("Will be populated in R0" is fine); it must never claim a capability the repo does not actually ship.
- The README is written for a reviewer who just cloned the repo with zero prior context — every command shown must actually work against the current `HEAD`.
- When in doubt, prefer shorter and truthful over longer and aspirational.

## Tooling (MCP)

- **Context7** — use for **any** library/framework/SDK/CLI question (Next.js, Prisma, Centrifugo, centrifuge-js, shadcn/ui, TanStack Query, Zustand, React Virtuoso, Tailwind, Docker Compose, etc.) to fetch **current** docs and implementation examples before writing code. Prefer it over web search and over relying on training memory, even for well-known libraries — APIs drift between versions. Use it for: API syntax, config options, version migrations, setup/wiring patterns, and library-specific debugging.
- **Playwright MCP** — use for **any** interaction with the running app (manual QA, smoke tests, reproducing a bug, verifying a UI change, clicking through a flow). Always re-open the browser at the start of a session and resize to fullscreen before interacting. Use it to take screenshots / DOM snapshots to verify behavior instead of guessing from code. Do **not** use Playwright MCP for pure unit-logic tasks where no browser is needed.

  **Debugging a failing e2e / UI issue:** bring the stack up yourself and drive it through Playwright MCP instead of re-running `ci-e2e.sh` in a loop. Typical flow:
  1. `KEEP_STACK=1 ./scripts/ci-e2e.sh` (runs the suite once against the prod stack and leaves it up) — preferred because it matches what tests see. Plain `docker compose up -d --build` uses the dev file (`next dev`) and is only for interactive development, not for reproducing e2e failures.
  2. `./scripts/wait-for-health.sh http://localhost:3080 120` to confirm `/api/health` is green.
  3. Drive the app via Playwright MCP against `http://localhost:3080` — log in, take snapshots, call `fetch()` via `browser_evaluate`, inspect Centrifugo presence with `docker compose exec app wget -qO- --header="Authorization: apikey …" http://centrifugo:3080/api/presence_stats`, tail logs with `docker compose logs --since=1m <svc>`.
  4. When done: `docker compose down -v --remove-orphans` (or rely on `ci-e2e.sh`'s trap).

  This is strictly for interactive debugging. The authoritative pass/fail signal is still `./scripts/ci-e2e.sh` — always re-run it once after a fix to confirm the suite is green end-to-end.

## What to avoid

- Putting authoritative message storage only in realtime payloads—**history belongs in Postgres**; Centrifugo is for delivery and optional ephemeral events.
- Using Zustand as the primary store for paginated history (use TanStack Query + Virtuoso).
- Blocking the main thread with non-virtualized huge message lists.

## Useful references in-repo

- Project overview and how to run it: [`README.md`](README.md) — keep this truthful at all times (see above).
- Requirements entrypoint: [`REQUIREMENTS.md`](REQUIREMENTS.md), full TOC: [`docs/index.md`](docs/index.md)
- Release plan: [`docs/plan/index.md`](docs/plan/index.md) — R0 demo-able MVP, R1 rich messaging, R2 social & presence, R3 moderation, R4 polish & submission, R5 advanced stretch
- OpenSpec workflow (if used): [`openspec/config.yaml`](openspec/config.yaml), skills under `.cursor/skills/`

When unsure, prefer **small, testable slices**: Prisma schema + one API + one screen + Centrifugo channel contract before expanding.
