## 1. Realtime auth transport refactor

- [ ] 1.1 Update `lib/centrifuge.ts` to use explicit token acquisition/refresh (`getToken`) for Centrifugo connections.
- [ ] 1.2 Update realtime provider wiring to handle unauthorized token refresh failures cleanly (disconnect state without infinite retries).
- [ ] 1.3 Remove code/comments that assume same-origin cookie-only Centrifugo auth.

## 2. Server and Centrifugo proxy auth alignment

- [ ] 2.1 Update `POST /api/centrifugo/connect` behavior/contracts to support the token-refresh client flow for authenticated callers.
- [ ] 2.2 Update `POST /api/centrifugo/subscribe` auth path to remain valid without relying on forwarded browser cookies.
- [ ] 2.3 Update `centrifugo/config.json` proxy header forwarding and related settings so separate-domain deployment works without cookie dependence.

## 3. Validation and regression coverage

- [ ] 3.1 Add/update unit tests for connect token issuance and unauthorized token refresh behavior.
- [ ] 3.2 Add/update tests for subscribe authorization (`room:*`, `dm:*`, `user:*`, `presence`) in the token-auth flow.
- [ ] 3.3 Add/update stack-backed e2e coverage proving realtime connect/reconnect works when web and Centrifugo endpoints use separate domains.

## 4. Documentation and verification

- [ ] 4.1 Update `.env.example` and runtime docs for domain-agnostic Centrifugo auth configuration (origins, WS URL, token settings).
- [ ] 4.2 Update `README.md` setup notes if reviewer/runtime flow changes.
- [ ] 4.3 Run required verification (`pnpm typecheck`, relevant unit tests, and targeted/full e2e as applicable) and attach outputs in `test-artifacts/`.
