import { test, expect, request as pwRequest } from "@playwright/test";
import {
  e2eBaseURL,
  makeUsers,
  register,
  signIn,
  signOut,
} from "./helpers/auth";
import {
  createPublicRoom,
  joinRoomFromCatalog,
  openRoomFromCatalog,
  roomIdFromUrl,
  searchRoomCatalog,
} from "./helpers/rooms";
import { befriendContexts } from "./helpers/social";

test.describe("R0 acceptance (13.x)", () => {
  // R0 acceptance tests spin up multiple browser contexts, register users,
  // join rooms, and assert realtime delivery (messages, unread, presence,
  // scroll-pill). Inner expects already use timeouts up to 15s, which only
  // fits under the 30s/15s budget test.slow() provides. Apply it across the
  // whole describe so individual multi-context flows don't flake on GHA.
  test.beforeEach(() => {
    test.slow();
  });

  test("13.2 public room: join, live message, unread clears when opening room", async ({
    browser,
  }) => {
    const users = makeUsers("t132");
    const roomName = `general_${users.a.username}`;

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    await createPublicRoom(pageA, roomName);
    await openRoomFromCatalog(pageA, roomName);

    await pageB.goto("/rooms");
    await searchRoomCatalog(pageB, roomName);
    await joinRoomFromCatalog(pageB, roomName);
    await openRoomFromCatalog(pageB, roomName);

    // Wait for Centrifugo to be connected on both tabs before fanning out a
    // live message. Without this the peer sometimes subscribes to the room
    // channel after `pageA` publishes, and the publication is silently
    // dropped — see CI flake on GHA (13.2) where pageA's ping never lands on
    // pageB.
    const connected = (page: typeof pageA) =>
      expect(page.locator("[data-realtime-status='connected']").first()).toBeVisible({
        timeout: 20_000,
      });
    await connected(pageA);
    await connected(pageB);

    const ping = `e2e-ping-${Date.now()}`;
    await pageA.getByPlaceholder("Message").fill(ping);
    await pageA.getByTestId("composer-send-btn").click();

    await expect(pageB.getByText(ping, { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await pageB.goto("/rooms");
    await pageB.locator("aside").getByRole("link", { name: roomName }).click();
    await expect(pageB.getByText(ping, { exact: true })).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });

  test("13.3 DM by username: live message and sidebar contact", async ({
    browser,
  }) => {
    const users = makeUsers("t133");

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    // R2 requires an accepted friendship before a DM can be created. This
    // was previously open to all users; see lib/social/relationships.ts.
    await befriendContexts(ctxA, ctxB);

    await pageA.getByRole("button", { name: "New DM" }).click();
    const dmDlg = pageA.getByRole("dialog", { name: "Start a DM" });
    await dmDlg
      .getByRole("button", { name: users.b.username, exact: true })
      .click();
    await pageA.waitForURL(/\/dm\/[^/]+$/, { timeout: 30_000 });

    const dmBody = `dm-e2e-${Date.now()}`;
    await pageA.getByPlaceholder("Message").fill(dmBody);
    await pageA.getByTestId("composer-send-btn").click();

    await expect(
      pageB.locator("aside").getByRole("link", { name: users.a.username }),
    ).toBeVisible({ timeout: 15_000 });

    await pageB.locator("aside").getByRole("link", { name: users.a.username }).click();
    await expect(pageB.getByText(dmBody, { exact: true })).toBeVisible({
      timeout: 15_000,
    });

    await ctxA.close();
    await ctxB.close();
  });

  test("13.4 presence: peer offline when all tabs closed, online again after reopen", async ({
    browser,
  }) => {
    const users = makeUsers("t134");
    const roomName = `pres_${users.a.username}`;

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    await createPublicRoom(pageA, roomName);
    await openRoomFromCatalog(pageA, roomName);

    await pageB.goto("/rooms");
    await searchRoomCatalog(pageB, roomName);
    await joinRoomFromCatalog(pageB, roomName);
    await openRoomFromCatalog(pageB, roomName);

    // R2 replaced the boolean `data-online` attribute on member rows with a
    // three-state `data-presence` ("online" | "afk" | "offline"). The
    // member-list component in `components/chat/member-list.tsx` now emits
    // only `data-presence=<status>`; this test was authored against the R0
    // attribute and needs to track that rename.
    const memberA = pageB.getByTestId(`member-${users.a.username}`);
    await expect(memberA).toHaveAttribute("data-presence", "online", {
      timeout: 20_000,
    });

    const storagePath = test.info().outputPath("a-reopen.json");
    await ctxA.storageState({ path: storagePath });
    await ctxA.close();

    await expect(memberA).toHaveAttribute("data-presence", "offline", {
      timeout: 15_000,
    });

    const ctxA2 = await browser.newContext({
      storageState: storagePath,
      baseURL: e2eBaseURL(),
    });
    const pageA2 = await ctxA2.newPage();
    await pageA2.goto("/rooms");
    await expect(pageA2.getByRole("heading", { name: "Public rooms" })).toBeVisible({
      timeout: 30_000,
    });

    await expect(memberA).toHaveAttribute("data-presence", "online", {
      timeout: 20_000,
    });

    await ctxA2.close();
    await ctxB.close();
  });

  test('13.5 scroll up: "New messages" pill when not pinned to bottom', async ({
    browser,
  }) => {
    const users = makeUsers("t135");
    const roomName = `scroll_${users.a.username}`;

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    await register(pageA, users.a);
    await createPublicRoom(pageA, roomName);
    await openRoomFromCatalog(pageA, roomName);
    const roomId = roomIdFromUrl(pageA.url());

    const storage = await ctxA.storageState();
    const api = await pwRequest.newContext({
      baseURL: e2eBaseURL(),
      storageState: storage,
    });
    try {
      const meta = await api.get(`/api/rooms/${roomId}`);
      expect(meta.ok()).toBeTruthy();
      const { room } = (await meta.json()) as {
        room: { conversationId: string };
      };
      const convId = room.conversationId;

      for (let i = 0; i < 55; i++) {
        const r = await api.post(`/api/conversations/${convId}/messages`, {
          headers: { "Content-Type": "application/json" },
          data: { body: `seed-${i}` },
        });
        expect(r.ok()).toBeTruthy();
      }
    } finally {
      await api.dispose();
    }

    await pageA.reload();
    await expect(pageA.getByText("seed-54", { exact: true })).toBeVisible({
      timeout: 30_000,
    });

    const scroller = pageA.locator("[data-virtuoso-scroller]").first();
    await scroller.waitFor({ state: "visible" });
    for (let i = 0; i < 25; i++) {
      await scroller.evaluate((el) => {
        el.scrollTop = Math.max(0, el.scrollTop - 200);
      });
    }

    const live = `live-pill-${Date.now()}`;
    await pageA.getByPlaceholder("Message").fill(live);
    await pageA.getByTestId("composer-send-btn").click();

    await expect(pageA.getByTestId("new-messages-pill")).toBeVisible({
      timeout: 15_000,
    });

    await ctxA.close();
  });

  test("13.6 sign-out in one session does not end other browser session", async ({
    browser,
  }) => {
    const users = makeUsers("t136");

    const ctx1 = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctx2 = await browser.newContext({ baseURL: e2eBaseURL() });
    const p1 = await ctx1.newPage();
    const p2 = await ctx2.newPage();

    await register(p1, users.a);
    await signIn(p2, users.a);

    await signOut(p1);
    await p2.goto("/rooms");
    await expect(p2.getByRole("heading", { name: "Public rooms" })).toBeVisible({
      timeout: 30_000,
    });

    await ctx1.close();
    await ctx2.close();
  });

  test("13.7 owner cannot leave; member can leave", async ({ browser }) => {
    const users = makeUsers("t137");
    const roomName = `leave_${users.a.username}`;

    const ownerCtx = await browser.newContext({ baseURL: e2eBaseURL() });
    const ownerPage = await ownerCtx.newPage();
    await register(ownerPage, users.a);
    await createPublicRoom(ownerPage, roomName);
    await openRoomFromCatalog(ownerPage, roomName);
    const roomId = roomIdFromUrl(ownerPage.url());
    const ownerStorage = await ownerCtx.storageState();

    const memberCtx = await browser.newContext({ baseURL: e2eBaseURL() });
    const memberPage = await memberCtx.newPage();
    await register(memberPage, users.b);
    await memberPage.goto("/rooms");
    await searchRoomCatalog(memberPage, roomName);
    await joinRoomFromCatalog(memberPage, roomName);
    const memberStorage = await memberCtx.storageState();

    const memberApi = await pwRequest.newContext({
      baseURL: e2eBaseURL(),
      storageState: memberStorage,
    });
    const ownerApi = await pwRequest.newContext({
      baseURL: e2eBaseURL(),
      storageState: ownerStorage,
    });

    try {
      expect(
        (await memberApi.post(`/api/rooms/${roomId}/leave`)).status(),
      ).toBe(204);
      expect(
        (await ownerApi.post(`/api/rooms/${roomId}/leave`)).status(),
      ).toBe(409);
    } finally {
      await memberApi.dispose();
      await ownerApi.dispose();
    }

    await ownerCtx.close();
    await memberCtx.close();
  });
});
