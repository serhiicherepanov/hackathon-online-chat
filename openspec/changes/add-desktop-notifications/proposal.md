## Why

Users currently have to keep the chat tab focused to notice new messages, mentions, or DMs. A classic web chat is expected to surface incoming activity via the operating system's native notification center so users can react within seconds even while another tab or app has focus. This is especially important for DMs and @-mentions where the 3-second delivery target is otherwise wasted when the tab is backgrounded.

## What Changes

- Add a **web app manifest** and minimal **PWA plumbing** (icons, theme color, `display: standalone`, start URL, installability) so the app can be installed on desktop (Chrome/Edge) and iOS 16.4+ — which is a hard prerequisite for Web Push on iOS.
- Register a **service worker** (`app/sw.ts` compiled to `/sw.js`, or `public/sw.js`) scoped to `/`, responsible for (a) receiving `push` events and showing OS notifications, (b) handling `notificationclick` to focus/open the relevant room/DM, (c) a minimal offline fallback page — no message caching (history stays server-of-truth).
- Add a **Notifications** settings panel that:
  - Detects browser support (`'Notification' in window`, `'serviceWorker' in navigator`, `'PushManager' in window`) and permission state (`default` / `granted` / `denied`).
  - Exposes a "Enable desktop notifications" button that calls `Notification.requestPermission()` on an explicit user gesture (never on page load — browsers will silently deny and blacklist the origin otherwise).
  - Lets users toggle categories: **DMs**, **@-mentions**, **new room messages (per room)**, **friend requests**. Defaults: DMs + mentions + friend requests ON, room messages OFF.
  - Lets users mute notifications for **1h / 8h / until tomorrow / indefinitely**.
  - Lets users toggle **sound on/off** per category and pick a volume (`off` / `soft` / `normal` / `loud`). Sounds off by default for room messages; on by default for DMs, mentions, and friend requests.
- Use the **Notification API** directly for **foreground** notifications (tab is open but not focused) — triggered from the existing Centrifugo subscription handlers, with no server round-trip. Respects the "tab visibility / focus" rule: no notification when the tab is focused and the relevant room/DM is open.
- Add **notification sounds** for foreground events (in-page `HTMLAudioElement` with a short preloaded WAV/OGG), with separate per-category volumes, a throttle so a message flood does not produce a stuttering audio burst, and a mandatory **gesture-unlock** step so Chrome/Safari autoplay policies don't silently swallow the first ping. Background (Web Push) notifications use the **OS notification's** own sound — the service worker cannot play audio, and mirroring sound there would double up.
- Use the **Web Push API + VAPID** for **background** notifications (all tabs closed or backgrounded to the point where JS is frozen):
  - Generate a VAPID keypair at deploy time; expose the public key via `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and keep the private key in `VAPID_PRIVATE_KEY` (server only).
  - New `PushSubscription` Prisma model (per-user, per-browser) with endpoint, p256dh, auth, user-agent, createdAt.
  - New `POST /api/push/subscribe` and `DELETE /api/push/subscribe` endpoints.
  - Server-side push fan-out via the `web-push` npm package, triggered from the same code paths that today publish to Centrifugo for DMs, mentions, and friend requests. Push is a **best-effort fallback** — Centrifugo remains the authoritative live-delivery transport.
  - Expired / `410 Gone` subscriptions are pruned automatically.
- Add a **`/api/health/push`** diagnostic endpoint (dev-only) and extend `.env.example` with the two VAPID vars.
- Docs: new section in `README.md` on enabling/installing the PWA and the notification flow; no changes to the submission `docker compose up` contract.

## Capabilities

### New Capabilities
- `pwa-shell`: Web app manifest, icons, service worker registration lifecycle, installability, and offline fallback page. The generic PWA plumbing other capabilities build on.
- `desktop-notifications`: End-to-end desktop notification behavior — permission UX, category preferences, mute windows, foreground Notification API usage, background Web Push via VAPID + service worker, click-to-focus/navigate, and subscription lifecycle.

### Modified Capabilities
- `app-skeleton`: Register the service worker from the root layout and add the manifest link; document the new env vars.
- `direct-messages`: DM delivery path must also trigger a push notification to the recipient's active push subscriptions when they are not connected to Centrifugo (or when the tab is not focused).
- `messages`: Room message path must trigger pushes for users who have enabled notifications for that specific room and who are currently offline / unfocused.
- `social-graph`: Friend request creation must trigger a push to the recipient if they opted in.

## Impact

- **New dependencies**: `web-push` (server), `idb-keyval` (client, tiny — to persist mute state and category prefs without a round-trip on every event).
- **New env vars**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto: URI required by the spec) — added to `.env.example` and both compose files as build/runtime args as appropriate.
- **New Prisma model**: `PushSubscription` + migration.
- **New files**: `app/manifest.ts`, `public/icons/*`, `public/sw.js` (or generated), `public/sounds/{dm,mention,room,friend}.ogg` (short < 1 s clips, ~10 KB each), `lib/notifications/*`, `app/api/push/subscribe/route.ts`, `components/settings/notifications-panel.tsx`.
- **Touched code paths**: every server-side "new message / new DM / new friend request" site gains a best-effort push dispatch; Centrifugo subscription handlers gain a foreground-notification dispatch.
- **No change** to the Docker Compose topology — no new service is required (push delivery goes out over HTTPS to browser push services, no broker needed).
- **Security**: service worker is served with the correct `Service-Worker-Allowed: /` header from Next.js; push payloads are encrypted by `web-push`; private VAPID key never leaves the server.
- **Scale note**: at ~300 concurrent users with the sizing hints from requirements, a single Node process running `web-push` is comfortably sufficient; no queue needed for R4-era scope. Revisit if R5 horizontal scaling lands.
