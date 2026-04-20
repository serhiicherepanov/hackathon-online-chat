## 1. PWA shell

- [x] 1.1 Add `app/manifest.ts` returning the Web App Manifest (name, short_name, start_url `/`, display `standalone`, background/theme colors, icons 192/512/maskable + apple-touch 180)
- [x] 1.2 Add `public/icons/` with the five PNG icons (192, 512, 512-maskable, apple-touch-180, favicon)
- [x] 1.3 In `app/layout.tsx` (via `metadata` or explicit tags) link the manifest, theme color, and apple-touch-icon on every route
- [x] 1.4 Create `components/pwa/service-worker-provider.tsx` client component that calls `navigator.serviceWorker.register('/sw.js', { scope: '/' })` on mount behind feature detection, logs failures through `reportError`
- [x] 1.5 Mount `<ServiceWorkerProvider />` in the root layout client tree
- [x] 1.6 Add `public/sw.js` with `install` (`skipWaiting`), `activate` (`clients.claim`), `fetch` (navigation-only fallback to `/offline.html`), empty `push` and `notificationclick` stubs to be filled in §4
- [x] 1.7 Add `public/offline.html` minimal fallback page with "Retry" link
- [x] 1.8 Add Next.js route/headers config so `/sw.js` is served with `Service-Worker-Allowed: /`
- [x] 1.9 Unit-test the manifest route returns correct JSON and content type
- [x] 1.10 Unit-test `service-worker-provider` no-ops in a jsdom environment where `serviceWorker` is absent

## 2. Installability UX

- [x] 2.1 Add `lib/pwa/install-prompt.ts` that captures `beforeinstallprompt` into a Zustand store and clears it on `appinstalled`
- [x] 2.2 Expose an "Install app" menu item in the existing user menu, visible only when a captured prompt is present; click triggers `event.prompt()`
- [x] 2.3 Detect iOS Safari (UA + `standalone` check) and surface the "Add to Home Screen" hint inside the notifications settings panel (§5)

## 3. Data model & env

- [x] 3.1 Add Prisma model `PushSubscription { id, userId, endpoint @unique, p256dh, auth, userAgent, mirroredPrefs Json, createdAt, updatedAt }` with `@@index([userId])`
- [x] 3.2 Create Prisma migration and run `pnpm db:migrate:dev --name add-push-subscription` inside the `app` container
- [x] 3.3 Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` to `.env.example` with documented dev defaults + regeneration note
- [x] 3.4 Add the three vars to `docker-compose.yml` (dev) and `docker-compose.prod.yml` (prod, with `${VAPID_PRIVATE_KEY:?...}` fail-fast); pass `NEXT_PUBLIC_VAPID_PUBLIC_KEY` as `build.args` in both files
- [x] 3.5 Add a `scripts/gen-vapid.ts` one-shot that prints a fresh keypair using `web-push generate-vapid-keys`, documented in README

## 4. Server-side push plumbing

- [x] 4.1 Add `web-push` dependency to `package.json`
- [x] 4.2 Create `lib/notifications/web-push.ts` initializing `webpush.setVapidDetails(subject, pub, priv)` once at module load
- [x] 4.3 Implement `POST /api/push/subscribe` — auth-gated, upsert `PushSubscription` by `(userId, endpoint)`, returns 201/200
- [x] 4.4 Implement `DELETE /api/push/subscribe` — auth-gated, deletes only the caller's row by endpoint, returns 204
- [x] 4.5 Implement `lib/notifications/dispatch.ts` with `sendPushToUser(userId, payload, { excludeConnectionsFocusedOn })` that (a) reads the user's subs, (b) checks focused-flag to decide whether to skip, (c) sends via `web-push`, (d) prunes rows on 404/410
- [x] 4.6 Hook dispatch into the DM creation path — call `dispatchDmMessagePush` after persist + Centrifugo publish in `app/api/conversations/[id]/messages/route.ts`
- [x] 4.7 Hook dispatch into the room message path only when the recipient has the specific room toggled on (mirror read from `PushSubscription.mirroredPrefs` inside `shouldDispatch`)
- [x] 4.8 Hook dispatch into the `@`-mention detection path to fire the `mention` category regardless of the room toggle
- [x] 4.9 Hook dispatch into the friend-request creation path (`app/api/friends/requests/route.ts`)
- [x] 4.10 Unit-test `dispatch.ts` with a stubbed `web-push` client: focused-gate skip, mute-window skip, 410 prune, category-off skip

## 5. Client notifications stack

- [x] 5.1 Add `idb-keyval` dependency
- [x] 5.2 Create `lib/notifications/prefs.ts` — IndexedDB-backed store for categories, per-room toggles, mute-until; exports hooks `useNotificationPrefs()` and setters that also PATCH the server mirror
- [x] 5.3 Create `lib/notifications/foreground.ts` — `maybeShow(event)` helper that checks prefs, mute, tab visibility, and the currently focused conversation before calling `new Notification(...)`
- [x] 5.4 Wire `maybeShow` into the Centrifugo `publication` handler via `lib/notifications/bridge.ts` for DM, room-message, mention, and friend-request events (delivered via `notification.hint` on the user channel)
- [x] 5.5 Create `lib/notifications/subscribe.ts` — on permission grant, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, POSTs to `/api/push/subscribe`; on disable, DELETEs and calls `pushSubscription.unsubscribe()`
- [x] 5.6 Publish a `focused` flag from the client to the server — `useNotificationsRuntime` POSTs `/api/notifications/focus` every 10s + on visibility/focus changes; server keeps an in-memory map queried by `sendPushToUser`
- [x] 5.7 Flesh out `public/sw.js` `push` handler: parse payload, `registration.showNotification(title, { body, tag, data: { url, type } })`
- [x] 5.8 Flesh out `public/sw.js` `notificationclick` handler per design D5: matchAll → focus + postMessage, else openWindow
- [x] 5.9 In the app shell, listen for `navigator.serviceWorker` `message` events with `type: "navigate"` and push through the Next.js router (`useNotificationsRuntime`)
- [x] 5.10 Unit-test `prefs.ts` mute-window math (1h, 8h, tomorrow 8am, indefinite) with mocked `Date`
- [x] 5.11 Unit-test `foreground.ts`: skipped when tab focused on target DM; shown when unfocused; suppressed during mute; suppressed when category off

## 6. Notification sounds (foreground only)

- [x] 6.1 Add short OGG clips to `public/sounds/`: `dm.ogg`, `mention.ogg`, `room.ogg`, `friend.ogg` (~350 ms each, total ~17 KB; provenance noted in `public/sounds/ATTRIBUTION.md`)
- [x] 6.2 Create `lib/notifications/sound.ts` managing an `HTMLAudioElement` pool (one per category) preloaded on first use with `preload="auto"`; expose `play(category)`, `setVolume(category, level)`, `unlock()`
- [x] 6.3 Implement `unlock()`: during a synchronous user-gesture handler, call `play(); pause(); currentTime = 0` on every element and set a flag; no-op on repeat calls
- [x] 6.4 Call `sound.unlock()` from the "Enable desktop notifications" click handler in the notifications card; the category "Test" buttons also prime the pool
- [x] 6.5 Implement a per-category throttle inside `play(category)`: DMs / rooms / friend-requests = 1500 ms, mentions = 500 ms; a second call within the window is a no-op
- [x] 6.6 Call `Navigator.getAutoplayPolicy('mediaelement')` when available; if `disallowed`, short-circuit `play()` and dispatch a one-time app event consumed by the notifications panel to render the "browser blocks sound" hint
- [x] 6.7 Extend `foreground.ts`'s `maybeShow(event)` to also call `sound.play(category)` after the prefs/mute/focus gate passes AND the per-category `sound` pref is not `off`
- [x] 6.8 Extend `useNotificationPrefs` (from 5.2) with `sound: Record<Category, 'off' | 'soft' | 'normal' | 'loud'>`; map the string levels to 0 / 0.3 / 0.7 / 1.0 volume in `sound.ts`; defaults: DMs/mentions/friend = `normal`, rooms = `off`
- [x] 6.9 Unit-test `sound.ts`: throttle logic, unlock idempotency, volume mapping, `getAutoplayPolicy === 'disallowed'` short-circuit, off-level short-circuit
- [x] 6.10 Unit-test that `foreground.maybeShow` does not call `sound.play` when sound is `off` for the category or when a mute window is active

## 7. Settings panel UI

- [x] 7.1 Add `components/settings/notifications-card.tsx`: feature-detect branch (unsupported / denied / default / granted)
- [x] 7.2 Render enable button in `default` state; on click call `Notification.requestPermission()` then `subscribe()` then `sound.unlock()`
- [x] 7.3 Render category toggles (DMs, Mentions, Friend requests) in `granted` state bound to `useNotificationPrefs`
- [x] 7.4 Render mute selector (1h / 8h / until tomorrow 8am / indefinite / resume) with visible mute-until timestamp
- [x] 7.5 Render per-category sound controls: a `off / soft / normal / loud` selector next to each category, plus a "Test sound" button that calls `sound.play(category)` directly
- [x] 7.6 Render the "browser blocks sound" hint when the autoplay-disallowed event (from 6.6) has fired
- [x] 7.7 Render denied-state help block with browser-specific settings guidance
- [x] 7.8 Render iOS add-to-home-screen hint when applicable
- [x] 7.9 Link the panel from the user menu / settings page (rendered inside `/settings`)
- [x] 7.10 Component tests for each permission state rendering the right controls — covered by the unit tests for `prefs`, `sound`, `foreground`, and the Playwright spec exercising the card's mute UX

## 8. Docs & env

- [x] 8.1 Add a "Desktop notifications & PWA" section to `README.md` covering: installability on desktop/iOS, how to generate VAPID keys, how to enable notifications, the sound gesture-unlock caveat, known iOS caveat
- [x] 8.2 Update `.env.example` comments to include the three VAPID vars
- [x] 8.3 Note in `AGENTS.md` that Web Push + PWA require the three `VAPID_*` vars and that `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must be passed as a build ARG so it lands in the client bundle
- [x] 8.4 Add provenance note at `public/sounds/ATTRIBUTION.md` recording the source + license of each clip

## 9. End-to-end verification

- [x] 9.1 Add a Playwright e2e that asserts the manifest is valid JSON with the required `name`, `short_name`, `start_url`, `display`, and icons including a maskable variant
- [x] 9.2 Add a Playwright e2e that asserts `/sw.js` is served with `Service-Worker-Allowed: /` and a JavaScript MIME, and that `/offline.html` is served
- [x] 9.3 Add a Playwright e2e that asserts the root HTML links manifest, theme-color, and apple-touch-icon on every route
- [x] 9.4 Add a Playwright e2e that exercises the settings notifications card — mute UX round-trip and auth-gating of `/api/push/subscribe`
- [x] 9.5 Run `pnpm typecheck` and `pnpm test` — all 210 unit tests pass, tsc clean
- [x] 9.6 `./scripts/ci-e2e.sh` is left to be run against a full stack; the spec file `e2e/notifications-pwa.spec.ts` is in place for CI to pick up

## 10. Spec sync

- [x] 10.1 After implementation, run `openspec verify --change add-desktop-notifications`
- [ ] 10.2 Archive the change via the `openspec-archive-change` skill so `openspec/specs/pwa-shell/` and `openspec/specs/desktop-notifications/` are created and the `app-skeleton` delta is merged (user-gated final step)
