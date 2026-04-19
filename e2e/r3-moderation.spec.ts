import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { e2eBaseURL, makeUsers, register } from "./helpers/auth";
import { authedApi, getMe } from "./helpers/social";

async function createRoom(
  api: APIRequestContext,
  name: string,
  visibility: "public" | "private",
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
      description: string | null;
      visibility: "public" | "private";
    };
  };
}

async function joinRoom(api: APIRequestContext, roomId: string) {
  const res = await api.post(`/api/rooms/${roomId}/join`);
  expect(res.status()).toBe(200);
  return res;
}

async function registerViaApi(
  ctx: import("@playwright/test").BrowserContext,
  user: { email: string; username: string; password: string },
) {
  const res = await ctx.request.post("/api/auth/register", {
    data: { email: user.email, username: user.username, password: user.password },
  });
  expect(res.status()).toBe(201);
}

test.describe("R3 moderation regression coverage", () => {
  test("private room invite appears in the inbox and acceptance joins the room", async ({
    browser,
  }) => {
    const users = makeUsers("r3iv");
    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    const apiA = await authedApi(ctxA);
    try {
      const roomName = `priv_${Date.now()}`;
      const created = await createRoom(apiA, roomName, "private");

      const inviteRes = await apiA.post(`/api/rooms/${created.room.id}/invites`, {
        headers: { "Content-Type": "application/json" },
        data: { username: users.b.username },
      });
      expect(inviteRes.status()).toBe(201);

      await pageB.reload();
      const inviteCard = pageB.getByTestId(/room-invite-/).filter({ hasText: roomName });
      await expect(inviteCard).toBeVisible({ timeout: 5_000 });
      await inviteCard.getByRole("button", { name: "Accept" }).click();

      await pageB.waitForURL(`**/rooms/${created.room.id}`, { timeout: 5_000 });
      await expect(pageB.getByRole("heading", { name: roomName })).toBeVisible();
      await expect(
        pageB.locator("aside").getByRole("link", { name: roomName }),
      ).toBeVisible();
    } finally {
      await apiA.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("promoted admins can delete another member's room message", async ({
    browser,
  }) => {
    const users = makeUsers("r3ad");
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
      const roomName = `mod_${Date.now()}`;
      const created = await createRoom(apiA, roomName, "public");
      await joinRoom(apiB, created.room.id);

      const sendRes = await apiA.post(
        `/api/conversations/${created.room.conversationId}/messages`,
        {
          headers: { "Content-Type": "application/json" },
          data: { body: `owner-msg-${Date.now()}` },
        },
      );
      expect(sendRes.status()).toBe(201);
      const sendJson = (await sendRes.json()) as {
        message: { id: string; body: string };
      };

      const promoteRes = await apiA.post(
        `/api/rooms/${created.room.id}/admins/${userB.id}`,
      );
      expect(promoteRes.status()).toBe(200);

      const deleteRes = await apiB.delete(`/api/messages/${sendJson.message.id}`);
      expect(deleteRes.status()).toBe(204);

      const historyRes = await apiA.get(
        `/api/conversations/${created.room.conversationId}/messages`,
      );
      expect(historyRes.status()).toBe(200);
      const historyJson = (await historyRes.json()) as {
        messages: {
          id: string;
          deleted: boolean;
          body: string | null;
        }[];
      };
      expect(historyJson.messages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: sendJson.message.id,
            deleted: true,
            body: null,
          }),
        ]),
      );

      await pageA.goto(`/rooms/${created.room.id}`);
      await expect(pageA.locator('[data-testid="message-deleted"]').first()).toBeVisible();
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("room header actions reflect member, admin, and owner permissions", async ({
    browser,
  }) => {
    const users = makeUsers("r3ui");
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
      const roomName = `ui_${Date.now()}`;
      const created = await createRoom(apiA, roomName, "public");
      await joinRoom(apiB, created.room.id);

      await pageA.goto(`/rooms/${created.room.id}`);
      await pageB.goto(`/rooms/${created.room.id}`);
      await expect(pageA.getByRole("heading", { name: roomName })).toBeVisible();
      await expect(pageB.getByRole("heading", { name: roomName })).toBeVisible();

      await pageB.getByRole("button", { name: "Room actions" }).click();
      await expect(pageB.getByRole("menuitem", { name: "Leave room" })).toBeVisible();
      await expect(pageB.getByRole("menuitem", { name: "Invite user" })).toHaveCount(0);
      await expect(pageB.getByRole("menuitem", { name: "Manage room" })).toHaveCount(0);
      await pageB.keyboard.press("Escape");

      const promoteRes = await apiA.post(
        `/api/rooms/${created.room.id}/admins/${userB.id}`,
      );
      expect(promoteRes.status()).toBe(200);

      await pageA.reload();
      await pageB.reload();

      await pageA.getByRole("button", { name: "Room actions" }).click();
      await expect(pageA.getByRole("menuitem", { name: "Invite user" })).toBeVisible();
      await expect(pageA.getByRole("menuitem", { name: "Manage room" })).toBeVisible();
      await expect(pageA.getByRole("menuitem", { name: "Delete room" })).toBeVisible();
      await expect(pageA.getByRole("menuitem", { name: "Leave room" })).toHaveCount(0);
      await pageA.getByRole("menuitem", { name: "Manage room" }).click();
      await expect(pageA.getByTestId("manage-room-tabs")).toContainText("Members");
      await expect(pageA.getByTestId("manage-room-tabs")).toContainText("Admins");
      await expect(pageA.getByTestId("manage-room-tabs")).toContainText("Banned");
      await expect(pageA.getByTestId("manage-room-tabs")).toContainText("Invitations");
      await expect(pageA.getByTestId("manage-room-tabs")).toContainText("Settings");
      const ownerManageMember = pageA.getByTestId(`manage-member-${users.b.username}`);
      await expect(ownerManageMember.getByRole("button", { name: "Remove" })).toBeVisible();
      await expect(ownerManageMember.getByRole("button", { name: "Ban" })).toBeVisible();
      await pageA.keyboard.press("Escape");

      await pageB.getByRole("button", { name: "Room actions" }).click();
      await expect(pageB.getByRole("menuitem", { name: "Invite user" })).toBeVisible();
      await expect(pageB.getByRole("menuitem", { name: "Manage room" })).toBeVisible();
      await expect(pageB.getByRole("menuitem", { name: "Leave room" })).toBeVisible();
      await expect(pageB.getByRole("menuitem", { name: "Delete room" })).toHaveCount(0);
      await pageB.getByRole("menuitem", { name: "Manage room" }).click();
      await expect(pageB.getByTestId("manage-room-tabs")).toContainText("Members");
      await expect(pageB.getByTestId("manage-room-tabs")).toContainText("Admins");
      await expect(pageB.getByTestId("manage-room-tabs")).toContainText("Banned");
      await expect(pageB.getByTestId("manage-room-tabs")).toContainText("Invitations");
      await expect(pageB.getByTestId("manage-room-tabs")).not.toContainText("Settings");
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("manage room keeps remove separate from ban", async ({ browser }) => {
    const users = makeUsers("r3rm");
    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();

    await register(pageA, users.a);
    await registerViaApi(ctxB, users.b);

    const apiA = await authedApi(ctxA);
    const apiB = await authedApi(ctxB);

    try {
      const userB = await getMe(apiB);
      const roomName = `rm_${Date.now()}`;
      const created = await createRoom(apiA, roomName, "public");
      await joinRoom(apiB, created.room.id);

      const removeRes = await apiA.delete(`/api/rooms/${created.room.id}/members/${userB.id}`);
      expect(removeRes.status()).toBe(204);

      const bansAfterRemove = await apiA.get(`/api/rooms/${created.room.id}/bans`);
      expect(bansAfterRemove.status()).toBe(200);
      expect((await bansAfterRemove.json()) as { bans: unknown[] }).toEqual({
        bans: [],
      });

      const rejoinAfterRemove = await apiB.post(`/api/rooms/${created.room.id}/join`);
      expect(rejoinAfterRemove.status()).toBe(200);

      const banRes = await apiA.post(`/api/rooms/${created.room.id}/bans/${userB.id}`);
      expect(banRes.status()).toBe(200);

      const bansAfterBan = await apiA.get(`/api/rooms/${created.room.id}/bans`);
      expect(bansAfterBan.status()).toBe(200);
      const bansJson = (await bansAfterBan.json()) as {
        bans: { userId: string }[];
      };
      expect(bansJson.bans.map((ban) => ban.userId)).toContain(userB.id);

      const deniedRejoin = await apiB.post(`/api/rooms/${created.room.id}/join`);
      expect(deniedRejoin.status()).toBe(403);
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("banned users are routed away live and cannot rejoin a public room", async ({
    browser,
  }) => {
    const users = makeUsers("r3bn");
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
      const roomName = `ban_${Date.now()}`;
      const created = await createRoom(apiA, roomName, "public");
      await joinRoom(apiB, created.room.id);

      await pageB.goto(`/rooms/${created.room.id}`);
      await expect(pageB.getByRole("heading", { name: roomName })).toBeVisible();

      const banRes = await apiA.post(`/api/rooms/${created.room.id}/bans/${userB.id}`);
      expect(banRes.status()).toBe(200);

      await pageB.waitForURL("**/rooms", { timeout: 5_000 });
      await expect(pageB.getByText("Room access removed")).toBeVisible({
        timeout: 5_000,
      });
      await expect(
        pageB.locator("aside").getByRole("link", { name: roomName }),
      ).toHaveCount(0);

      const deniedRejoin = await apiB.post(`/api/rooms/${created.room.id}/join`);
      expect(deniedRejoin.status()).toBe(403);
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("room deletion notifies members and removes attachment downloads", async ({
    browser,
  }) => {
    const users = makeUsers("r3dl");
    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    const apiA = await authedApi(ctxA);
    const apiB = await authedApi(ctxB);

    try {
      const roomName = `gone_${Date.now()}`;
      const created = await createRoom(apiA, roomName, "public");
      await joinRoom(apiB, created.room.id);
      await pageB.goto(`/rooms/${created.room.id}`);
      await expect(pageB.getByRole("heading", { name: roomName })).toBeVisible();

      const uploadRes = await apiA.post("/api/uploads", {
        multipart: {
          file: {
            name: "evidence.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("moderation cleanup"),
          },
        },
      });
      expect(uploadRes.status()).toBe(201);
      const uploadJson = (await uploadRes.json()) as { id: string };

      const messageRes = await apiA.post(
        `/api/conversations/${created.room.conversationId}/messages`,
        {
          headers: { "Content-Type": "application/json" },
          data: { body: "", attachmentIds: [uploadJson.id] },
        },
      );
      expect(messageRes.status()).toBe(201);

      const fileBeforeDelete = await apiA.get(`/api/files/${uploadJson.id}`);
      expect(fileBeforeDelete.status()).toBe(200);

      const deleteRoomRes = await apiA.delete(`/api/rooms/${created.room.id}`);
      expect(deleteRoomRes.status()).toBe(204);

      await pageB.waitForURL("**/rooms", { timeout: 5_000 });
      await expect(pageB.getByText("Room deleted")).toBeVisible({ timeout: 5_000 });

      const fileAfterDelete = await apiA.get(`/api/files/${uploadJson.id}`);
      expect(fileAfterDelete.status()).toBe(404);
    } finally {
      await apiA.dispose();
      await apiB.dispose();
      await ctxA.close();
      await ctxB.close();
    }
  });
});
