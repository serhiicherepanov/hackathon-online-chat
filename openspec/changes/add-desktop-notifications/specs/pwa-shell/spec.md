## ADDED Requirements

### Requirement: Web app manifest

The app SHALL serve a valid Web App Manifest at `/manifest.webmanifest` (via Next.js `app/manifest.ts`) that makes the site installable as a PWA on desktop (Chrome/Edge) and iOS 16.4+.

#### Scenario: Manifest is served with correct content type

- **WHEN** a browser requests `GET /manifest.webmanifest`
- **THEN** the app responds with `200 OK` and `Content-Type: application/manifest+json`
- **AND** the body parses as JSON and contains `name`, `short_name`, `start_url: "/"`, `display: "standalone"`, `background_color`, `theme_color`, and an `icons` array with at least `192x192` and `512x512` PNG entries including one with `"purpose": "maskable"`

#### Scenario: Root layout links the manifest

- **WHEN** any page in the app is rendered
- **THEN** the HTML `<head>` contains `<link rel="manifest" href="/manifest.webmanifest">`
- **AND** it contains `<meta name="theme-color">` with the same value as the manifest's `theme_color`
- **AND** it contains `<link rel="apple-touch-icon">` pointing to a 180×180 icon (iOS installability requirement)

### Requirement: Service worker registration

The app SHALL serve a service worker at `/sw.js` scoped to `/` and register it from the client on first mount, so Web Push and click-to-focus can function.

#### Scenario: Service worker is served at origin root

- **WHEN** a browser requests `GET /sw.js`
- **THEN** the app responds with `200 OK` and `Content-Type: application/javascript`
- **AND** the response includes `Service-Worker-Allowed: /` so the SW can claim root scope

#### Scenario: Client registers the service worker on app shell mount

- **WHEN** the chat app shell mounts in a browser that supports `navigator.serviceWorker`
- **THEN** the client calls `navigator.serviceWorker.register('/sw.js', { scope: '/' })` exactly once per page load
- **AND** registration failures are logged via `reportError` but do not break the page
- **AND** in browsers without service-worker support, no error is thrown and the rest of the app continues to function

#### Scenario: Service worker activates on update without stale sessions

- **WHEN** a new version of `/sw.js` is deployed and a returning user loads the app
- **THEN** the new SW calls `self.skipWaiting()` during `install` and `clients.claim()` during `activate`
- **AND** the next navigation in any open tab is controlled by the new SW without requiring the user to close all tabs first

### Requirement: Offline fallback page only

The service worker SHALL NOT cache application code, API responses, or message history; it MAY cache only a single minimal offline fallback HTML page served when a navigation request fails while offline.

#### Scenario: Navigation while offline returns the fallback page

- **WHEN** the browser is offline and the user navigates to any in-app route
- **THEN** the SW responds with the precached `/offline.html` fallback page
- **AND** the fallback page explains that the app requires a connection and offers a "Retry" link

#### Scenario: Non-navigation requests are not intercepted for caching

- **WHEN** the SW handles a `fetch` event whose request is not a navigation (e.g. API, static asset, Centrifugo WS handshake)
- **THEN** the SW either does not call `event.respondWith` or delegates to the network with no cache layer
- **AND** no message, DM, or attachment response is written to any cache

### Requirement: Installability UX

The app SHALL expose an "Install app" affordance in the user menu when the browser reports the install criteria are met (via the `beforeinstallprompt` event on Chromium), and SHALL show iOS-specific guidance on iOS Safari when the app is not yet installed.

#### Scenario: Chromium install prompt is offered from user menu

- **WHEN** the browser fires `beforeinstallprompt`
- **THEN** the app stores the event and shows an "Install app" menu item
- **AND** clicking it calls `event.prompt()` and hides the item on `appinstalled`

#### Scenario: iOS Safari shows add-to-home-screen hint in notifications panel

- **WHEN** the user opens the notifications settings panel on iOS Safari and the app is not yet installed to the home screen
- **THEN** the panel displays a short instruction: "To enable notifications on iPhone/iPad, tap Share → Add to Home Screen, then reopen this app"
- **AND** the instruction does not appear on desktop or Android browsers
