/* Service worker for Online Chat — handles Web Push, notificationclick, and
 * a minimal offline fallback. Does NOT cache app code, API responses, or
 * message history (history stays server-of-truth; see openspec pwa-shell).
 */
/* eslint-disable no-restricted-globals */

const OFFLINE_URL = "/offline.html";
const OFFLINE_CACHE = "online-chat-offline-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(OFFLINE_CACHE);
      try {
        await cache.add(OFFLINE_URL);
      } catch {
        // offline fallback is best-effort
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== OFFLINE_CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.mode !== "navigate") return;
  event.respondWith(
    (async () => {
      try {
        return await fetch(req);
      } catch {
        const cache = await caches.open(OFFLINE_CACHE);
        const cached = await cache.match(OFFLINE_URL);
        if (cached) return cached;
        return new Response("Offline", { status: 503, statusText: "Offline" });
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  const title = payload.title || "Online Chat";
  const options = {
    body: payload.body || "",
    tag: payload.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url: payload.url || "/",
      type: payload.type || "generic",
      ...(payload.data || {}),
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        try {
          const url = new URL(client.url);
          if (url.origin === self.location.origin) {
            await client.focus();
            try {
              client.postMessage({ type: "navigate", url: targetUrl });
            } catch {
              // ignore postMessage failures (cross-origin, closed client)
            }
            return;
          }
        } catch {
          // malformed URL — ignore
        }
      }
      await self.clients.openWindow(targetUrl);
    })(),
  );
});
