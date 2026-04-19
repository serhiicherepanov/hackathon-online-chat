import { expect, test } from "@playwright/test";
import { e2eBaseURL, makeUsers, register } from "./helpers/auth";
import { createPublicRoom, openRoomFromCatalog, roomIdFromUrl } from "./helpers/rooms";
import { authedApi, createAcceptedFriendship, getMe } from "./helpers/social";

test.describe("mobile sidebar", () => {
  test.beforeEach(() => {
    test.slow();
  });

  test("mobile drawer opens and switches between a room and a DM", async ({ browser }) => {
    const users = makeUsers("msb");
    const roomName = `mobile_${users.a.username}`;

    const mobileCtx = await browser.newContext({
      baseURL: e2eBaseURL(),
      viewport: { width: 390, height: 844 },
    });
    const peerCtx = await browser.newContext({ baseURL: e2eBaseURL() });
    const mobilePage = await mobileCtx.newPage();
    const peerPage = await peerCtx.newPage();

    await register(mobilePage, users.a);
    await register(peerPage, users.b);

    const apiA = await authedApi(mobileCtx);
    const apiB = await authedApi(peerCtx);

    try {
      await createPublicRoom(mobilePage, roomName);
      await openRoomFromCatalog(mobilePage, roomName);
      const roomId = roomIdFromUrl(mobilePage.url());

      const peerUser = await getMe(apiB);
      await createAcceptedFriendship(apiA, apiB, peerUser.id);

      const dmRes = await apiA.post(`/api/dm/${encodeURIComponent(peerUser.username)}`);
      expect(dmRes.ok()).toBeTruthy();
      const dmJson = (await dmRes.json()) as { conversationId: string };

      await mobilePage.reload();
      await expect(mobilePage.getByPlaceholder("Message")).toBeVisible({ timeout: 15_000 });

      await mobilePage.getByTestId("mobile-nav-trigger").click();
      const drawer = mobilePage.getByRole("dialog", { name: "Navigation" });
      await expect(drawer).toBeVisible({ timeout: 15_000 });
      await expect(drawer.getByTestId(`sidebar-room-row-${roomId}`)).toBeVisible();
      await expect(drawer.getByTestId(`sidebar-dm-row-${peerUser.id}`)).toBeVisible();

      await drawer.getByTestId(`sidebar-dm-row-${peerUser.id}`).click();
      await mobilePage.waitForURL(new RegExp(`/dm/${dmJson.conversationId}$`), {
        timeout: 15_000,
      });
      await expect(mobilePage.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);

      await mobilePage.getByTestId("mobile-nav-trigger").click();
      const reopenedDrawer = mobilePage.getByRole("dialog", { name: "Navigation" });
      await expect(reopenedDrawer).toBeVisible({ timeout: 15_000 });
      await reopenedDrawer.getByTestId(`sidebar-room-row-${roomId}`).click();

      await mobilePage.waitForURL(new RegExp(`/rooms/${roomId}$`), { timeout: 15_000 });
      await expect(mobilePage.getByRole("dialog", { name: "Navigation" })).toHaveCount(0);
      await expect(mobilePage.getByPlaceholder("Message")).toBeVisible({ timeout: 15_000 });
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await mobileCtx.close();
      await peerCtx.close();
    }
  });
});
