## 1. PWA shell

- [ ] 1.1 Add `app/manifest.ts` returning the Web App Manifest (name, short_name, start_url `/`, display `standalone`, background/theme colors, icons 192/512/maskable + apple-touch 180)
- [ ] 1.2 Add `public/icons/` with the five PNG icons (192, 512, 512-maskable, apple-touch-180, favicon)
- [ ] 1.3 In `app/layout.tsx` (via `metadata` or explicit tags) link the manifest, theme color, and apple-touch-icon on every route
- [ ] 1.4 Create `components/pwa/service-worker-provider.tsx` client component that calls `navigator.serviceWorker.register('/sw.js', { scope: '/' })` on mount behind feature detection, logs failures through `reportError`
- [ ] 1.5 Mount `<ServiceWorkerProvider />` in the root layout client tree
- [ ] 1.6 Add `public/sw.js` with `install` (`skipWaiting`), `activate` (`clients.claim`), `fetch` (navigation-only fallback to `/offline.html`), empty `push` and `notificationclick` stubs to be filled in §4
- [ ] 1.7 Add `public/offline.html` minimal fallback page with "Retry" link
- [ ] 1.8 Add Next.js route/headers config so `/sw.js` is served with `Service-Worker-Allowed: /`
- [ ] 1.9 Unit-test the manifest route returns correct JSON and content type
- [ ] 1.10 Unit-test `service-worker-provider` no-ops in a jsdom environment where `serviceWorker` is absent

## 2. Installability UX

- [ ] 2.1 Add `lib/pwa/install-prompt.ts` that captures `beforeinstallprompt` into a Zustand store and clears it on `appinstalled`
- [ ] 2.2 Expose an "Install app" menu item in the existing user menu, visible only when a captured prompt is present; click triggers `event.prompt()`
- [ ] 2.3 Detect iOS Safari (UA + `standalone` check) and surface the "Add to Home Screen" hint inside the notifications settings panel (§5)

## 3. Data model & env

- [ ] 3.1 Add Prisma model `PushSubscription { id, userId, endpoint @unique, p256dh, auth, userAgent, mirroredPrefs Json, createdAt, updatedAt }` with `@@index([userId])`
- [ ] 3.2 Create Prisma migration and run `pnpm db:migrate:dev --name add-push-subscription` inside the `app` container
- [ ] 3.3 Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` to `.env.example` with documented dev defaults + regeneration note
- [ ] 3.4 Add the three vars to `docker-compose.yml` (dev) and `docker-compose.prod.yml` (prod, with `${VAPID_PRIVATE_KEY:?...}` fail-fast); pass `NEXT_PUBLIC_VAPID_PUBLIC_KEY` as `build.args` in both files
- [ ] 3.5 Add a `scripts/gen-vapid.ts` one-shot that prints a fresh keypair using `web-push generate-vapid-keys`, documented in README

## 4. Server-side push plumbing

- [ ] 4.1 Add `web-push` dependency to `package.json`
- [ ] 4.2 Create `lib/notifications/web-push.ts` initializing `webpush.setVapidDetails(subject, pub, priv)` once at module load
- [ ] 4.3 Implement `POST /api/push/subscribe` — auth-gated, upsert `PushSubscription` by `(userId, endpoint)`, returns 201/200
- [ ] 4.4 Implement `DELETE /api/push/subscribe` — auth-gated, deletes only the caller's row by endpoint, returns 204
- [ ] 4.5 Implement `lib/notifications/dispatch.ts` with `sendPushToUser(userId, payload, { excludeConnectionsFocusedOn })` that (a) reads the user's subs, (b) checks Centrifugo presence + focused-flag to decide whether to skip, (c) sends via `web-push`, (d) prunes rows on 404/410
- [ ] 4.6 Hook dispatch into the DM creation path (see `openspec/specs/direct-messages/spec.md`) — call `sendPushToUser(recipient, ...)` after persist + Centrifugo publish
- [ ] 4.7 Hook dispatch into the room message path only when the recipient has the specific room toggled on (mirror read from `PushSubscription.mirroredPrefs`)
- [ ] 4.8 Hook dispatch into the `@`-mention detection path to fire the `mention` category regardless of the room toggle
- [ ] 4.9 Hook dispatch into the friend-request creation path
- [ ] 4.10 Unit-test `dispatch.ts` with a stubbed `web-push` client: presence-gate skip, mute-window skip, 410 prune, payload shape

## 5. Client notifications stack

- [ ] 5.1 Add `idb-keyval` dependency
- [ ] 5.2 Create `lib/notifications/prefs.ts` — IndexedDB-backed store for categories, per-room toggles, mute-until; exports hooks `useNotificationPrefs()` and setters that also PATCH the server mirror
- [ ] 5.3 Create `lib/notifications/foreground.ts` — `maybeShow(event)` helper that checks prefs, mute, tab visibility, and the currently focused conversation before calling `new Notification(...)`
- [ ] 5.4 Wire `maybeShow` into the Centrifugo `publication` handler for DM, room-message, mention, and friend-request events
- [ ] 5.5 Create `lib/notifications/subscribe.ts` — on permission grant, calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, POSTs to `/api/push/subscribe`; on sign-out, DELETEs and calls `pushSubscription.unsubscribe()`
- [ ] 5.6 Publish a `focused` flag from the client to the server (piggyback on existing presence heartbeat) reflecting `document.visibilityState === 'visible' && document.hasFocus()`; server records it per connection for the dispatch presence-gate
- [ ] 5.7 Flesh out `public/sw.js` `push` handler: decrypt payload (done by the browser), `registration.showNotification(title, { body, tag, data: { url, type } })`
- [ ] 5.8 Flesh out `public/sw.js` `notificationclick` handler per design D5: matchAll → focus + postMessage, else openWindow
- [ ] 5.9 In the app shell, listen for `navigator.serviceWorker` `message` events with `type: "navigate"` and push through the Next.js router
- [ ] 5.10 Unit-test `prefs.ts` mute-window math (1h, 8h, tomorrow 8am, indefinite) with mocked `Date`
- [ ] 5.11 Unit-test `foreground.ts`: skipped when tab focused on target DM; shown when unfocused; suppressed during mute; suppressed when category off

## 6. Notification sounds (foreground only)

- [ ] 6.1 Add short royalty-free OGG clips to `public/sounds/`: `dm.ogg`, `mention.ogg`, `room.ogg`, `friend.ogg` (≤ 1 s, normalized, total ≤ 40 KB)
- [ ] 6.2 Create `lib/notifications/sound.ts` managing an `HTMLAudioElement` pool (one per category) preloaded on module import with `preload="auto"`; expose `play(category)`, `setVolume(category, level)`, `unlock()`
- [ ] 6.3 Implement `unlock()`: during a synchronous user-gesture handler, call `play(); pause(); currentTime = 0` on every element and set a flag; no-op on repeat calls
- [ ] 6.4 Call `sound.unlock()` from the "Enable desktop notifications" click handler AND from a one-shot `document.addEventListener('click', …, { once: true, capture: true })` fallback installed on app mount
- [ ] 6.5 Implement a per-category throttle inside `play(category)`: DMs / rooms / friend-requests = 1500 ms, mentions = 500 ms; a second call within the window is a no-op
- [ ] 6.6 Call `Navigator.getAutoplayPolicy('mediaelement')` when available; if `disallowed`, short-circuit `play()` and dispatch a one-time app event consumed by the notifications panel to render the "browser blocks sound" hint
- [ ] 6.7 Extend `foreground.ts`'s `maybeShow(event)` to also call `sound.play(category)` after the prefs/mute/focus gate passes AND the per-category `sound` pref is not `off`
- [ ] 6.8 Extend `useNotificationPrefs` (from 5.2) with `sound: Record<Category, 'off' | 'soft' | 'normal' | 'loud'>`; map the string levels to 0 / 0.3 / 0.7 / 1.0 volume in `sound.ts`; defaults: DMs/mentions/friend = `normal`, rooms = `off`
- [ ] 6.9 Unit-test `sound.ts`: throttle logic, unlock idempotency, volume mapping, `getAutoplayPolicy === 'disallowed'` short-circuit (with `HTMLAudioElement.prototype.play` mocked)
- [ ] 6.10 Unit-test that `foreground.maybeShow` does not call `sound.play` when sound is `off` for the category or when a mute window is active

## 7. Settings panel UI

- [ ] 7.1 Add `components/settings/notifications-panel.tsx`: feature-detect branch (unsupported / denied / default / granted)
- [ ] 7.2 Render enable button in `default` state; on click call `Notification.requestPermission()` then `subscribe()` then `sound.unlock()`
- [ ] 7.3 Render category toggles (DMs, Mentions, Friend requests, per-room list) in `granted` state bound to `useNotificationPrefs`
- [ ] 7.4 Render mute selector (1h / 8h / until tomorrow 8am / indefinite / resume) with live countdown when a mute is active
- [ ] 7.5 Render per-category sound controls: a `off / soft / normal / loud` selector next to each category, plus a "Test sound" button that calls `sound.play(category)` directly
- [ ] 7.6 Render the "browser blocks sound" hint when the autoplay-disallowed event (from 6.6) has fired
- [ ] 7.7 Render denied-state help block with browser-specific settings links
- [ ] 7.8 Render iOS add-to-home-screen hint when applicable
- [ ] 7.9 Link the panel from the user menu / settings page
- [ ] 7.10 Component tests for each of the four permission states rendering the right controls, and for sound controls toggling prefs

## 8. Docs & env

- [ ] 8.1 Add a "Desktop notifications & PWA" section to `README.md` covering: installability on desktop/iOS, how to generate VAPID keys, how to enable notifications, the sound gesture-unlock caveat, known iOS caveat
- [ ] 8.2 Update `.env.example` comments and any existing env-var table in README to include the three VAPID vars
- [ ] 8.3 Note in `AGENTS.md`'s Compose section that `/sw.js` must be served with `Service-Worker-Allowed: /`
- [ ] 8.4 Add a short provenance note next to `public/sounds/` README (or an `ATTRIBUTION.md`) recording the source + license of each clip

## 9. End-to-end verification

- [ ] 9.1 Add a Playwright e2e that: grants notification permission via browser context, registers a push subscription against a stubbed push service, sends a DM from user B to user A, asserts user A's SW receives the event and that the in-app unread state updates (full OS-notification rendering cannot be asserted cross-browser — assert on the SW message + DB state)
- [ ] 9.2 Add a Playwright e2e for foreground: user A has a tab open but focused on a different room; user B sends a DM; assert the app invokes the Notification constructor AND calls `play()` on the DM audio element (spy both via `page.addInitScript`)
- [ ] 9.3 Add a Playwright e2e for sound throttle: fire 5 DM events within 500 ms and assert `play()` is invoked at most once
- [ ] 9.4 Add a Playwright e2e for click-to-focus: simulate a `notificationclick` by posting the SW `message` directly to a client and assert the router lands on the target DM
- [ ] 9.5 Run `pnpm typecheck` and `pnpm test` inside the `app` container
- [ ] 9.6 Run `./scripts/ci-e2e.sh` with `E2E_ARGS="-g desktop-notifications"` and attach the log to the PR

## 10. Spec sync

- [ ] 10.1 After implementation, run `openspec verify --change add-desktop-notifications`
- [ ] 10.2 Archive the change via the `openspec-archive-change` skill so `openspec/specs/pwa-shell/` and `openspec/specs/desktop-notifications/` are created and the `app-skeleton` delta is merged
