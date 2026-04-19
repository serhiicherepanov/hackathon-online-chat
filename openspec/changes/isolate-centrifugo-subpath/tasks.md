## 1. Compose & Traefik wiring

- [ ] 1.1 Add a Traefik `stripprefix` middleware `centrifugo-strip` on the `centrifugo` service in `docker-compose.prod.yml` and switch the existing router's rule from `PathPrefix(/connection)` to `PathPrefix(/centrifugo)` with the new middleware attached (priority stays `100`, service port `3080` unchanged).
- [ ] 1.2 Mirror the same router + middleware labels in `docker-compose.yml` (dev) so local and e2e stacks use the identical public URL shape.
- [ ] 1.3 Verify the `app` router still catches `PathPrefix(/)` at `priority=1` so it owns every non-`/centrifugo` path — no regression on `/api/health`, `/api/centrifugo/connect`, or Next.js routes.

## 2. Centrifugo config and proxy endpoints

- [ ] 2.1 In both compose files, add `CENTRIFUGO_CLIENT_PROXY_CONNECT_ENDPOINT` and `CENTRIFUGO_CHANNEL_PROXY_SUBSCRIBE_ENDPOINT` to the `centrifugo` service's `environment:` block, defaulting to the existing in-compose URLs (`http://app:3080/api/centrifugo/connect` and `/subscribe`) so a single-box deploy is unchanged.
- [ ] 2.2 Update `centrifugo/README.md` to document the env mapping for both new variables and note that editing `centrifugo/config.json` per deploy is no longer needed.

## 3. Env examples and defaults

- [ ] 3.1 Update `.env.example`: change the default `NEXT_PUBLIC_CENTRIFUGO_WS_URL` to `ws://localhost:3080/centrifugo/connection/websocket`; expand the `CENTRIFUGO_URL` comment to clarify that the public/subpath form is only for split deploys.
- [ ] 3.2 Update `.env.e2e.example`: change `NEXT_PUBLIC_CENTRIFUGO_WS_URL` to the `/centrifugo/connection/websocket` form so the image built by `./scripts/ci-e2e.sh` bakes the new URL into the client bundle.
- [ ] 3.3 Add `CENTRIFUGO_CLIENT_PROXY_CONNECT_ENDPOINT` and `CENTRIFUGO_CHANNEL_PROXY_SUBSCRIBE_ENDPOINT` as commented-out overrides in `.env.example` with example values for a Vercel-split deployment.

## 4. README and documentation

- [ ] 4.1 Update the Centrifugo deployment section in `README.md` to use `wss://<host>/centrifugo/connection/websocket` in the example `.env` block (current example still shows `/connection/websocket`).
- [ ] 4.2 Add a new "Split deploy: Vercel app + self-hosted Centrifugo" subsection to `README.md` listing the exact env values for both sides and the three gotchas (cookie parent-domain, TLS for WS, proxy endpoints must point at the public app URL).
- [ ] 4.3 Sanity-check that other docs (`docs/plan/*`, any `openspec/project.md` references) don't hardcode `/connection/websocket` without the new prefix; update if they do.

## 5. Verification

- [ ] 5.1 `pnpm typecheck` passes (no code imports change, but confirms nothing slipped).
- [ ] 5.2 `pnpm test` passes, including the existing `lib/centrifugo/http-api-url.test.ts` subpath coverage.
- [ ] 5.3 `shellcheck scripts/*.sh docker/*.sh` clean (no shell scripts are modified, but run to be sure).
- [ ] 5.4 Run `timeout 900 ./scripts/ci-e2e.sh 2>&1 | tee test-artifacts/isolate-centrifugo-subpath-e2e.log | tail -n 5` and confirm the full e2e suite stays green against the prod compose with the new URL shape (exercises connect + subscribe + publish over `/centrifugo/*`).
- [ ] 5.5 Manual smoke from inside the running prod container: `docker compose -f docker-compose.prod.yml exec app wget -qO- --header="Authorization: apikey $CENTRIFUGO_API_KEY" http://traefik:3080/centrifugo/api/info` returns a `200 OK` Centrifugo info body (proves Traefik StripPrefix forwards the admin API correctly).
- [ ] 5.6 Mark the matching OpenSpec scenarios (`app-skeleton`: subpath exposure + env-overridable proxy endpoints; `submission-readiness`: split-deploy docs) as covered in the PR description.
