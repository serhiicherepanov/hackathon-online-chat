# Testing

Unit tests use **Vitest** + **React Testing Library** (jsdom). End-to-end tests
use **Playwright** against the real Compose stack. Tests are colocated next to
the code they cover (`foo.ts` ↔ `foo.test.ts`).

## Unit tests

```bash
pnpm test          # single run
pnpm test:watch    # watch mode
```

## End-to-end tests (Playwright)

Specs live under `e2e/` and run against a fully-wired Compose stack — not a
mocked app. `e2e/global-setup.ts` probes `GET /api/health` before the suite
starts and aborts fast if the stack isn't up.

### One-time setup

```bash
pnpm install
pnpm exec playwright install chromium
# On Linux without system libs: pnpm exec playwright install --with-deps chromium
```

### Canonical run

The authoritative pass/fail signal is `scripts/ci-e2e.sh`, which brings the
stack up (prod compose file), waits for health, runs Playwright, and tears it
down while dumping logs to `test-artifacts/`:

```bash
./scripts/ci-e2e.sh
```

Useful env knobs:

| Var                   | Effect                                              |
| --------------------- | --------------------------------------------------- |
| `KEEP_STACK=1`        | Leave the stack up after the run                    |
| `HEADED=1`            | Run with a visible browser (needs DISPLAY)          |
| `UI=1`                | Playwright UI mode                                  |
| `DEBUG=1`             | Playwright Inspector                                |
| `SLOWMO_MS=250`       | Slow each action down                               |
| `E2E_ARGS='-g "sign in"'` | Forward args to Playwright (whitespace-free)    |
| `TRAEFIK_BIND_PORT=3081` | Avoid a port conflict                            |
| `HEALTH_TIMEOUT=300`  | Slower machines                                     |

Headed / UI / debug modes need an X11 or Wayland display; prefix with
`xvfb-run -a` on headless boxes.

### Ad-hoc Playwright against a running dev stack

```bash
docker compose up -d --build
./scripts/wait-for-health.sh http://localhost:3080 120

pnpm test:e2e                    # headless
pnpm test:e2e:ui                 # interactive
pnpm exec playwright test --headed
pnpm exec playwright test --debug
pnpm exec playwright test e2e/r0-acceptance.spec.ts:42 --ui
pnpm exec playwright test -g "sign in" --ui
pnpm exec playwright show-report
```

Point the suite at a non-default host/port via `PLAYWRIGHT_BASE_URL`.

## Timeouts and logs

Always wrap test commands with a hard timeout and tee output to
`test-artifacts/` (gitignored):

```bash
timeout 900 ./scripts/ci-e2e.sh 2>&1 | tee test-artifacts/e2e.log | tail -n 5
```

Rough budgets: unit `~60s`, full Playwright `~300–420s`, `ci-e2e.sh` incl.
prod image build `~900s`.

## CI scripts

| Script                        | What it does                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `scripts/ci-unit.sh`          | Preflights tooling, runs `pnpm exec prisma generate` → `pnpm check:prisma-client` → `pnpm lint` → `pnpm typecheck` → `pnpm test`. |
| `pnpm verify:ci`              | Runs `scripts/ci-unit.sh` and then `pnpm build` (which also regenerates Prisma client + runs the sync check) to catch deploy-time regressions early. |
| `scripts/ci-e2e.sh`           | Preflights, brings up the prod compose stack, waits for health, runs Playwright, dumps logs + HTML report to `test-artifacts/`, tears the stack down. |
| `scripts/wait-for-health.sh`  | Polls `$1/api/health` until 200 or timeout.                                                   |

Scripts never install anything — they exit `2` with the exact command needed
if a prereq is missing. Expected host state:

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium   # add --with-deps on Linux (once)
```

GitHub Actions (`.github/workflows/ci.yml`) runs `pnpm verify:ci` in the
`unit` job and `scripts/ci-e2e.sh` in the `e2e` job, then uploads
`test-artifacts/` on failure.

## Troubleshooting

If Playwright reports `/api/health returned 500` or similar:

1. `docker compose ps` — every service should be `running` / `healthy`.
2. `docker compose logs app | tail -n 50` — look for `migrations applied,
   starting next dev`. If `prisma migrate deploy` failed, fix the migration
   or reset data with `docker compose down -v`.
3. `docker compose exec db pg_isready -U chat -d chat` — DB reachable?
4. `docker compose exec app wget -qO- http://localhost:3080/api/health` —
   health probe directly against the app (bypasses Traefik).
5. Port conflict? `TRAEFIK_BIND_PORT=3081 docker compose up -d` and
   `PLAYWRIGHT_BASE_URL=http://localhost:3081 pnpm test:e2e`.
6. Stale build? `docker compose build --no-cache app && docker compose up -d`.
