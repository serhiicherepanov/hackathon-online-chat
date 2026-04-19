import type {
  APIRequestContext,
  BrowserContext,
  Page,
} from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eBaseURL, makeUsers, type TestUser } from "./helpers/auth";
import { authedApi, createAcceptedFriendship, getMe } from "./helpers/social";
import { E2E_NOW_HEADER } from "@/lib/presence/request-now";

async function createRoom(api: APIRequestContext, name: string) {
  const res = await api.post("/api/rooms", {
    headers: { "Content-Type": "application/json" },
    data: { name, visibility: "public" },
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as {
    room: { id: string; name: string };
  };
}

async function registerViaApi(page: Page, user: TestUser) {
  const res = await page.context().request.post("/api/auth/register", {
    data: {
      email: user.email,
      username: user.username,
      password: user.password,
    },
  });
  expect(res.ok()).toBeTruthy();
}

async function installPresenceTimeHeaders(page: Page) {
  await page.addInitScript((headerName: string) => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = (input, init) => {
      const request = input instanceof Request ? input : null;
      const url =
        typeof input === "string"
          ? new URL(input, window.location.origin)
          : input instanceof URL
            ? input
            : request
              ? new URL(request.url)
              : null;

      if (!url || !url.pathname.startsWith("/api/presence")) {
        return originalFetch(input, init);
      }

      const headers = new Headers(init?.headers ?? request?.headers);
      headers.set(headerName, String(Date.now()));

      if (request && !init) {
        return originalFetch(new Request(request, { headers }));
      }

      return originalFetch(input, { ...init, headers });
    };
  }, E2E_NOW_HEADER);
}

async function advanceBoth(pageA: Page, pageB: Page, ms: number) {
  await pageA.clock.runFor(ms);
  await pageB.clock.runFor(ms);
}

async function closeContexts(
  apiA: APIRequestContext,
  apiB: APIRequestContext,
  ctxA: BrowserContext,
  ctxB: BrowserContext,
) {
  await Promise.allSettled([apiA.dispose(), apiB.dispose()]);
  await Promise.allSettled([ctxA.close(), ctxB.close()]);
}

async function startSyntheticActivity(page: Page, intervalMs: number) {
  await page.evaluate((ms) => {
    const trigger = () => {
      document.dispatchEvent(
        new MouseEvent("mousemove", {
          bubbles: true,
          cancelable: true,
          view: window,
        }),
      );
    };

    trigger();
    const handle = window.setInterval(trigger, ms);
    (
      window as typeof window & {
        __presenceActivityHandle?: number;
      }
    ).__presenceActivityHandle = handle;
  }, intervalMs);
}

async function stopSyntheticActivity(page: Page) {
  await page.evaluate(() => {
    const state = window as typeof window & {
      __presenceActivityHandle?: number;
    };
    if (state.__presenceActivityHandle !== undefined) {
      window.clearInterval(state.__presenceActivityHandle);
      delete state.__presenceActivityHandle;
    }
  });
}

test.describe("presence-afk-active-user", () => {
  test("active user stays online during repeated activity and turns afk after idle", async ({
    browser,
  }) => {
    const users = makeUsers("afk");
    const roomName = `afk-room-${Date.now()}`;
    const baseURL = e2eBaseURL();
    const baseTime = Date.now();

    const ctxA = await browser.newContext({ baseURL });
    const ctxB = await browser.newContext({ baseURL });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await installPresenceTimeHeaders(pageA);
    await installPresenceTimeHeaders(pageB);
    await pageA.clock.install({ time: baseTime });
    await pageB.clock.install({ time: baseTime });

    await registerViaApi(pageA, users.a);
    await registerViaApi(pageB, users.b);

    const apiA = await authedApi(ctxA);
    const apiB = await authedApi(ctxB);

    try {
      const userA = await getMe(apiA);
      const userB = await getMe(apiB);

      await createAcceptedFriendship(apiA, apiB, userB.id);

      const created = await createRoom(apiA, roomName);
      const joinRes = await apiB.post(`/api/rooms/${created.room.id}/join`);
      expect(joinRes.ok()).toBeTruthy();

      await pageA.goto(`/rooms/${created.room.id}`);
      await pageB.goto(`/rooms/${created.room.id}`);
      await expect(pageB.getByRole("heading", { name: roomName })).toBeVisible({
        timeout: 15_000,
      });

      const memberBadge = pageB.getByTestId(`member-presence-${userA.id}`);
      await expect(memberBadge).toBeVisible();

      await startSyntheticActivity(pageA, 15_000);
      await advanceBoth(pageA, pageB, 20_000);
      await expect(memberBadge).toHaveAttribute("data-presence", "online");

      await advanceBoth(pageA, pageB, 70_000);
      await expect(memberBadge).toHaveAttribute("data-presence", "online");

      await stopSyntheticActivity(pageA);
      await advanceBoth(pageA, pageB, 60_000);
      await expect(memberBadge).toHaveAttribute("data-presence", "online");

      await advanceBoth(pageA, pageB, 5_000);
      await expect(memberBadge).toHaveAttribute("data-presence", "afk");
    } finally {
      await closeContexts(apiA, apiB, ctxA, ctxB);
    }
  });
});
