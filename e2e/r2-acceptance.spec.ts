import type { APIRequestContext } from "@playwright/test";
import { test, expect } from "@playwright/test";
import { e2eBaseURL, makeUsers, register } from "./helpers/auth";
import {
  createPublicRoom,
  joinRoomFromCatalog,
  openRoomFromCatalog,
  searchRoomCatalog,
} from "./helpers/rooms";
import {
  authedApi,
  createAcceptedFriendship,
  getMe,
} from "./helpers/social";

type FriendsSnapshot = {
  friends: {
    friendshipId: string;
    peer: { id: string; username: string };
    status: "online" | "afk" | "offline";
    requestedAt: string;
    updatedAt: string;
  }[];
  inboundRequests: {
    friendshipId: string;
    peer: { id: string; username: string };
    direction: "inbound" | "outbound";
    requestedAt: string;
  }[];
  outboundRequests: {
    friendshipId: string;
    peer: { id: string; username: string };
    direction: "inbound" | "outbound";
    requestedAt: string;
  }[];
  blockedUsers: {
    peer: { id: string; username: string };
    blockedAt: string;
  }[];
};

async function getFriendsSnapshot(api: APIRequestContext) {
  const res = await api.get("/api/friends");
  expect(res.ok()).toBeTruthy();
  return (await res.json()) as FriendsSnapshot;
}

test.describe("R2 acceptance (social graph)", () => {
  // Multi-context social-graph tests drive two authenticated browsers and
  // assert live friendship / presence / typing / block fanout. Inner expects
  // already use 10–15s timeouts, which is only coherent with the 30s/15s
  // budget from test.slow(). Apply it uniformly so tests don't flake on GHA
  // runners when the default 10s test budget is consumed by setup alone.
  test.beforeEach(() => {
    test.slow();
  });

  test("friend request acceptance unlocks first DM creation", async ({
    browser,
  }) => {
    const users = makeUsers("r2fr");

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    const apiA = await authedApi(ctxA);
    const apiB = await authedApi(ctxB);

    try {
      const userA = await getMe(apiA);
      const userB = await getMe(apiB);

      const deniedDm = await apiA.post(`/api/dm/${encodeURIComponent(userB.username)}`);
      expect(deniedDm.status()).toBe(403);

      const requestRes = await apiA.post("/api/friends/requests", {
        headers: { "Content-Type": "application/json" },
        data: { userId: userB.id },
      });
      expect(requestRes.status()).toBe(201);

      const pendingForB = await getFriendsSnapshot(apiB);
      expect(pendingForB.inboundRequests).toHaveLength(1);
      expect(pendingForB.inboundRequests[0]?.peer.username).toBe(userA.username);

      const acceptRes = await apiB.post(
        `/api/friends/requests/${pendingForB.inboundRequests[0]?.friendshipId}/accept`,
      );
      expect(acceptRes.status()).toBe(200);

      const friendsForA = await getFriendsSnapshot(apiA);
      expect(friendsForA.friends).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            peer: expect.objectContaining({ id: userB.id, username: userB.username }),
          }),
        ]),
      );

      await pageA.getByRole("button", { name: "+ New DM" }).click();
      const dmDlg = pageA.getByRole("dialog", { name: "Start a DM" });
      await dmDlg
        .getByRole("button", { name: userB.username, exact: true })
        .click();
      await pageA.waitForURL(/\/dm\/[^/]+$/, { timeout: 30_000 });

      const dmBody = `friend-dm-${Date.now()}`;
      await pageA.getByPlaceholder("Message").fill(dmBody);
      await pageA.getByRole("button", { name: "Send" }).click();

      const dmLinkOnB = pageB.locator("aside").getByRole("link", {
        name: userA.username,
      });
      await expect(dmLinkOnB).toBeVisible({ timeout: 15_000 });
      await dmLinkOnB.click();
      await expect(pageB.getByText(dmBody, { exact: true })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("block freezes an existing DM until unblock", async ({ browser }) => {
    const users = makeUsers("r2bl");

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    const apiA = await authedApi(ctxA);
    const apiB = await authedApi(ctxB);

    try {
      const userA = await getMe(apiA);
      const userB = await getMe(apiB);

      await createAcceptedFriendship(apiA, apiB, userB.id);

      // Create the DM + bootstrap message via API so the freeze-on-block
      // assertions (the real subject of this test) have budget room inside
      // the 10s per-test timeout. The UI `+ New DM` dialog and live peer
      // delivery are covered by `friend request acceptance unlocks first
      // DM creation` — repeating them here is pure setup overhead.
      const dmOpen = await apiA.post(
        `/api/dm/${encodeURIComponent(userB.username)}`,
      );
      expect(dmOpen.ok()).toBeTruthy();
      const dmOpenJson = (await dmOpen.json()) as { conversationId: string };
      const conversationId = dmOpenJson.conversationId;
      expect(conversationId).toBeTruthy();

      const bootstrapRes = await apiA.post(
        `/api/conversations/${conversationId}/messages`,
        {
          headers: { "Content-Type": "application/json" },
          data: { body: `before-block-${Date.now()}` },
        },
      );
      expect(bootstrapRes.ok()).toBeTruthy();

      await pageA.goto(`/dm/${conversationId}`);
      await pageB.goto(`/dm/${conversationId}`);

      const blockRes = await apiA.post("/api/blocks", {
        headers: { "Content-Type": "application/json" },
        data: { userId: userB.id },
      });
      expect(blockRes.status()).toBe(201);

      const dmContactsForA = await apiA.get("/api/me/dm-contacts");
      expect(dmContactsForA.ok()).toBeTruthy();
      const contactsJson = (await dmContactsForA.json()) as {
        contacts: { conversationId: string; frozen: boolean; peer: { username: string } }[];
      };
      expect(contactsJson.contacts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            conversationId,
            frozen: true,
            peer: expect.objectContaining({ username: userB.username }),
          }),
        ]),
      );

      const blockedAttempt = await apiB.post(
        `/api/conversations/${conversationId}/messages`,
        {
          headers: { "Content-Type": "application/json" },
          data: { body: `blocked-send-${Date.now()}` },
        },
      );
      expect(blockedAttempt.status()).toBe(403);

      await pageB.getByPlaceholder("Message").fill("blocked from UI");
      await pageB.getByRole("button", { name: "Send" }).click();
      await expect(pageB.getByText("Could not send message.")).toBeVisible();

      const unblockRes = await apiA.delete(`/api/blocks/${userB.id}`);
      expect(unblockRes.status()).toBe(204);

      const afterUnblock = `after-unblock-${Date.now()}`;
      await pageB.getByPlaceholder("Message").fill(afterUnblock);
      await pageB.getByRole("button", { name: "Send" }).click();
      await expect(pageA.getByText(afterUnblock, { exact: true })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("contacts page drives the full friend request lifecycle through the UI", async ({
    browser,
  }) => {
    const users = makeUsers("r2cu");

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    const apiA = await authedApi(ctxA);
    const apiB = await authedApi(ctxB);

    try {
      const userA = await getMe(apiA);
      const userB = await getMe(apiB);

      await pageA.goto("/contacts");
      await pageA.getByRole("heading", { name: "Contacts" }).waitFor();
      await pageA.getByPlaceholder("User id").fill(userB.id);
      await pageA.getByRole("button", { name: "Send request" }).click();
      await expect(
        pageA
          .getByTestId("contacts-outbound")
          .getByText(userB.username, { exact: true }),
      ).toBeVisible({ timeout: 10_000 });

      await pageB.goto("/contacts");
      const inbound = pageB.getByTestId("contacts-inbound");
      await expect(
        inbound.getByText(userA.username, { exact: true }),
      ).toBeVisible({ timeout: 15_000 });
      await inbound.getByRole("button", { name: "Accept" }).click();
      await expect(
        pageB
          .getByTestId("contacts-friends")
          .getByText(userA.username, { exact: true }),
      ).toBeVisible({ timeout: 10_000 });

      await pageA.reload();
      await expect(
        pageA
          .getByTestId("contacts-friends")
          .getByText(userB.username, { exact: true }),
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("presence reports online while connected and offline after the last tab closes", async ({
    browser,
  }) => {
    const users = makeUsers("r2pr");

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    const apiA = await authedApi(ctxA);
    const apiB = await authedApi(ctxB);

    try {
      const userA = await getMe(apiA);

      // Let A's tab establish a Centrifugo connection.
      await pageA.waitForTimeout(1000);

      // Explicit heartbeat guarantees lastActiveAt is fresh and pairs with
      // connectionCount > 0 to yield `online` via the aggregation rule.
      const hb = await apiA.post("/api/presence/heartbeat");
      expect(hb.ok()).toBeTruthy();

      const onlineSnapshot = await apiB.get(
        `/api/presence?userIds=${encodeURIComponent(userA.id)}`,
      );
      const onlineJson = (await onlineSnapshot.json()) as {
        presence: { userId: string; status: "online" | "afk" | "offline" }[];
      };
      expect(onlineJson.presence[0]?.status).toBe("online");

      // Closing A's last tab drops connectionCount to 0, so status must
      // become `offline` regardless of a recent heartbeat.
      await apiA.dispose();
      await ctxA.close();
      await pageB.waitForTimeout(1500);

      const offline = await apiB.get(
        `/api/presence?userIds=${encodeURIComponent(userA.id)}`,
      );
      const offlineJson = (await offline.json()) as {
        presence: { userId: string; status: "online" | "afk" | "offline" }[];
      };
      expect(offlineJson.presence[0]?.status).toBe("offline");
    } finally {
      await apiB.dispose();
      await ctxB.close();
    }
  });

  test("typing indicator surfaces for a DM peer and expires", async ({
    browser,
  }) => {
    const users = makeUsers("r2dt");

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    const apiA = await authedApi(ctxA);
    const apiB = await authedApi(ctxB);

    try {
      const userA = await getMe(apiA);
      const userB = await getMe(apiB);

      await createAcceptedFriendship(apiA, apiB, userB.id);

      const dmRes = await apiA.post(
        `/api/dm/${encodeURIComponent(userB.username)}`,
      );
      expect(dmRes.ok()).toBeTruthy();
      const dmJson = (await dmRes.json()) as { conversationId: string };
      const conversationId = dmJson.conversationId;
      expect(conversationId).toBeTruthy();

      // Both peers open the DM so they subscribe to dm:{conversationId}.
      await pageA.goto(`/dm/${conversationId}`);
      await pageB.goto(`/dm/${conversationId}`);
      await pageA.getByPlaceholder("Message").waitFor();
      await pageB.getByPlaceholder("Message").waitFor();

      // Give both centrifuge clients a moment to subscribe.
      await pageB.waitForTimeout(1500);

      // A types; the composer publishes typing on the first keystroke (throttled).
      await pageA.getByPlaceholder("Message").fill("drafting a reply");

      const indicatorB = pageB.getByTestId("typing-indicator");
      await expect(indicatorB).toHaveAttribute("data-active", "true", {
        timeout: 10_000,
      });
      await expect(indicatorB).toContainText(userA.username);

      // After ~4s of silence the indicator auto-expires client-side.
      await pageA.getByPlaceholder("Message").fill("");
      await expect(indicatorB).toHaveAttribute("data-active", "false", {
        timeout: 10_000,
      });
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("typing indicator is visible to other members of a room", async ({
    browser,
  }) => {
    const users = makeUsers("r2rt");

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    const apiA = await authedApi(ctxA);

    try {
      const userA = await getMe(apiA);

      const roomName = `typing-room-${Date.now()}`;
      await createPublicRoom(pageA, roomName);
      await openRoomFromCatalog(pageA, roomName);

      await pageB.goto("/rooms");
      await searchRoomCatalog(pageB, roomName);
      await joinRoomFromCatalog(pageB, roomName);
      await openRoomFromCatalog(pageB, roomName);

      await pageA.getByPlaceholder("Message").waitFor();
      await pageB.getByPlaceholder("Message").waitFor();
      await pageB.waitForTimeout(1500);

      await pageA.getByPlaceholder("Message").fill("hello room");

      const indicatorB = pageB.getByTestId("typing-indicator");
      await expect(indicatorB).toHaveAttribute("data-active", "true", {
        timeout: 10_000,
      });
      await expect(indicatorB).toContainText(userA.username);
    } finally {
      await apiA.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });
});
