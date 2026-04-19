import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { e2eBaseURL, makeUsers, register } from "./helpers/auth";
import { authedApi, createAcceptedFriendship, getMe } from "./helpers/social";

async function createRoom(
  api: APIRequestContext,
  name: string,
  visibility: "public" | "private" = "public",
) {
  const res = await api.post("/api/rooms", {
    headers: { "Content-Type": "application/json" },
    data: { name, visibility },
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as {
    room: {
      id: string;
      conversationId: string;
      name: string;
      visibility: "public" | "private";
    };
  };
}

test.describe("sidebar-avatar-presence", () => {
  test("reuses one generated user avatar across signed-in surfaces", async ({
    browser,
  }) => {
    const users = makeUsers("sap");
    const roomName = `sap-room-${Date.now()}`;

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    const apiA = await authedApi(ctxA);
    const apiB = await authedApi(ctxB);

    try {
      const userB = await getMe(apiB);
      await createAcceptedFriendship(apiA, apiB, userB.id);

      const created = await createRoom(apiA, roomName);
      const joinRes = await apiB.post(`/api/rooms/${created.room.id}/join`);
      expect(joinRes.ok()).toBeTruthy();

      const dmRes = await apiA.post(`/api/dm/${encodeURIComponent(userB.username)}`);
      expect(dmRes.ok()).toBeTruthy();

      const messageRes = await apiB.post(
        `/api/conversations/${created.room.conversationId}/messages`,
        {
          headers: { "Content-Type": "application/json" },
          data: { body: "avatar consistency message" },
        },
      );
      expect(messageRes.ok()).toBeTruthy();

      await pageA.goto(`/rooms/${created.room.id}`);
      await expect(pageA.getByRole("heading", { name: roomName })).toBeVisible({
        timeout: 15_000,
      });

      const sidebarDmAvatar = pageA.getByTestId(`sidebar-dm-avatar-${userB.id}`);
      const sidebarDmBadge = pageA.getByTestId(`sidebar-dm-presence-${userB.id}`);
      const memberAvatar = pageA.getByTestId(`member-avatar-${userB.id}`);
      const memberBadge = pageA.getByTestId(`member-presence-${userB.id}`);
      const roomAvatar = pageA.getByTestId(`sidebar-room-avatar-${created.room.id}`);
      const roomMessage = pageA
        .getByTestId("message-item")
        .filter({ hasText: "avatar consistency message" })
        .first();
      const messageAvatar = roomMessage.locator('[data-testid^="message-avatar-"]');

      await expect(sidebarDmAvatar).toBeVisible();
      await expect(sidebarDmBadge).toBeVisible();
      await expect(memberAvatar).toBeVisible();
      await expect(memberBadge).toBeVisible();
      await expect(roomAvatar).toBeVisible();
      await expect(messageAvatar).toBeVisible();

      const sidebarSeed = await sidebarDmAvatar.getAttribute("data-avatar-seed");
      const memberSeed = await memberAvatar.getAttribute("data-avatar-seed");
      const messageSeed = await messageAvatar.getAttribute("data-avatar-seed");

      expect(sidebarSeed).toBe(`user:${userB.id}`);
      expect(memberSeed).toBe(sidebarSeed);
      expect(messageSeed).toBe(sidebarSeed);
      await expect(roomAvatar).toHaveAttribute(
        "data-avatar-seed",
        `room:${created.room.id}`,
      );

      await pageA.goto("/contacts");
      const contactsAvatar = pageA.getByTestId(`contacts-friend-avatar-${userB.id}`);
      const contactsBadge = pageA.getByTestId(`contacts-friend-presence-${userB.id}`);
      await expect(contactsAvatar).toBeVisible();
      await expect(contactsBadge).toBeVisible();

      const contactsSeed = await contactsAvatar.getAttribute("data-avatar-seed");
      expect(contactsSeed).toBe(sidebarSeed);
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });
});
