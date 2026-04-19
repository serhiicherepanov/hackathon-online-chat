import { expect, test } from "@playwright/test";
import { getLatestPasswordResetUrl } from "./helpers/password-reset";
import { e2eBaseURL, makeUsers, register, signIn, signOut } from "./helpers/auth";
import {
  createPublicRoom,
  joinRoomFromCatalog,
  openRoomFromCatalog,
  searchRoomCatalog,
} from "./helpers/rooms";
import { authedApi, befriendContexts } from "./helpers/social";

test.describe("R4 account management", () => {
  test.beforeEach(() => {
    test.slow();
  });

  test("password reset request + confirm flow works via the logged reset URL", async ({
    browser,
  }) => {
    const users = makeUsers("r4p");
    const nextPassword = "password54321";

    const ctx = await browser.newContext({ baseURL: e2eBaseURL() });
    const page = await ctx.newPage();

    await register(page, users.a);
    await signOut(page);

    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill(users.a.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(
      page.getByText("If an account exists for that email, a reset link has been issued."),
    ).toBeVisible({ timeout: 15_000 });

    const resetUrl = await getLatestPasswordResetUrl(users.a.email);
    await page.goto(resetUrl);
    await page.getByLabel("New password").fill(nextPassword);
    await page.getByRole("button", { name: "Save new password" }).click();
    await expect(page.getByText("Your password has been reset.")).toBeVisible({
      timeout: 15_000,
    });

    await signIn(page, { ...users.a, password: nextPassword });
    await expect(page.getByRole("heading", { name: "Public rooms" })).toBeVisible({
      timeout: 30_000,
    });

    await ctx.close();
  });

  test("revoking another active session logs out only the targeted browser", async ({
    browser,
  }) => {
    const users = makeUsers("r4s");

    const ownerCtx = await browser.newContext({ baseURL: e2eBaseURL() });
    const otherCtx = await browser.newContext({ baseURL: e2eBaseURL() });
    const ownerPage = await ownerCtx.newPage();
    const otherPage = await otherCtx.newPage();

    await register(ownerPage, users.a);
    await signIn(otherPage, users.a);

    await ownerPage.goto("/settings");
    const otherSessionRow = ownerPage
      .locator("[data-testid^='session-row-']")
      .filter({ has: ownerPage.getByRole("button", { name: "Revoke session" }) })
      .first();
    await expect(otherSessionRow).toBeVisible({ timeout: 15_000 });
    await otherSessionRow.getByRole("button", { name: "Revoke session" }).click();

    await expect(
      ownerPage.locator("[data-testid^='session-row-']"),
    ).toHaveCount(1, { timeout: 15_000 });

    await expect(async () => {
      const res = await otherPage.context().request.get("/api/auth/me");
      expect(res.status()).toBe(401);
    }).toPass({ timeout: 15_000 });

    await expect(ownerPage.getByRole("heading", { name: "Settings" })).toBeVisible();

    await ownerCtx.close();
    await otherCtx.close();
  });

  test("delete account removes owned rooms and tombstones preserved DM history", async ({
    browser,
  }) => {
    const users = makeUsers("r4d");
    const roomName = `owned_${users.a.username}`;
    const dmBody = `tombstone-${Date.now()}`;

    const ownerCtx = await browser.newContext({ baseURL: e2eBaseURL() });
    const memberCtx = await browser.newContext({ baseURL: e2eBaseURL() });
    const ownerPage = await ownerCtx.newPage();
    const memberPage = await memberCtx.newPage();

    await register(ownerPage, users.a);
    await register(memberPage, users.b);

    await createPublicRoom(ownerPage, roomName);
    await openRoomFromCatalog(ownerPage, roomName);

    await memberPage.goto("/rooms");
    await searchRoomCatalog(memberPage, roomName);
    await joinRoomFromCatalog(memberPage, roomName);

    await befriendContexts(ownerCtx, memberCtx);

    await ownerPage.goto("/rooms");
    const connected = (page: typeof ownerPage) =>
      expect(page.locator("[data-realtime-status='connected']").first()).toBeVisible({
        timeout: 20_000,
      });
    await connected(ownerPage);
    await connected(memberPage);
    await ownerPage.getByRole("button", { name: "New DM" }).click();
    await ownerPage
      .getByRole("dialog", { name: "Start a DM" })
      .getByRole("button", { name: users.b.username, exact: true })
      .click();
    await ownerPage.waitForURL(/\/dm\/[^/]+$/, { timeout: 30_000 });
    await ownerPage.getByPlaceholder("Message").fill(dmBody);
    await ownerPage.getByTestId("composer-send-btn").click();

    await expect(
      memberPage.locator("aside").getByRole("link", { name: users.a.username }),
    ).toBeVisible({ timeout: 15_000 });
    const memberApi = await authedApi(memberCtx);
    const dmConversationId = await (async () => {
      try {
        const res = await memberApi.get("/api/me/dm-contacts");
        expect(res.ok()).toBeTruthy();
        const json = (await res.json()) as {
          contacts: { conversationId: string; peer: { username: string } }[];
        };
        const row = json.contacts.find((contact) => contact.peer.username === users.a.username);
        expect(row?.conversationId).toBeTruthy();
        return row!.conversationId;
      } finally {
        await memberApi.dispose();
      }
    })();

    await memberPage.goto(`/dm/${dmConversationId}`);
    await expect(memberPage.getByText(dmBody, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    const dmUrl = memberPage.url();

    await ownerPage.goto("/settings");
    await ownerPage.getByTestId("delete-account-username").fill(users.a.username);
    await ownerPage
      .getByTestId("delete-account-confirmation")
      .fill("DELETE MY ACCOUNT");
    await ownerPage.getByTestId("delete-account-submit").click();
    await ownerPage.waitForURL("**/sign-in", { timeout: 30_000 });

    await memberPage.goto(dmUrl);
    await expect(memberPage.getByText(dmBody, { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      memberPage.getByTestId("message-author").filter({ hasText: "Deleted user" }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await memberPage.goto("/rooms");
    await searchRoomCatalog(memberPage, roomName);
    await expect(memberPage.getByText(roomName, { exact: true })).toHaveCount(0);

    await ownerCtx.close();
    await memberCtx.close();
  });
});
