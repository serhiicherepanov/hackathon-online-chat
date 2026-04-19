import { test, expect, request as pwRequest, type Page } from "@playwright/test";
import { e2eBaseURL, makeUsers, register } from "./helpers/auth";
import {
  createPublicRoom,
  joinRoomFromCatalog,
  openRoomFromCatalog,
  roomIdFromUrl,
  searchRoomCatalog,
} from "./helpers/rooms";

// Minimal valid PNG (1x1 transparent) for upload smoke tests.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII=";
const TINY_PNG = Buffer.from(TINY_PNG_BASE64, "base64");

async function getConvIdForRoom(
  api: Awaited<ReturnType<typeof pwRequest.newContext>>,
  roomId: string,
): Promise<string> {
  const res = await api.get(`/api/rooms/${roomId}`);
  expect(res.ok()).toBeTruthy();
  const { room } = (await res.json()) as {
    room: { conversationId: string };
  };
  return room.conversationId;
}

async function waitForEmptyConversation(page: Page): Promise<void> {
  await expect(page.getByTestId("composer-input")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByTestId("message-list-root")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByText("No messages yet. Start the conversation."),
  ).toBeVisible({
    timeout: 10_000,
  });
}

test.describe("R1 acceptance (rich messaging)", () => {
  // Every test in this file drives two browser contexts and asserts live
  // realtime fanout between them. Several inner expects already wait up to
  // 10s, which only makes sense with the 30s/15s budget that test.slow()
  // provides — under the default 10s per-test budget the setup regularly
  // eats the timeout before the final assertion runs. Apply test.slow()
  // uniformly so GHA runners don't flake on multi-context overhead.
  test.beforeEach(() => {
    test.slow();
  });

  test("9.2 emoji picker inserts into composer and fans out live", async ({
    browser,
  }) => {
    const users = makeUsers("u92");
    const roomName = `emo_${users.a.username}`;

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

    await pageA.getByTestId("composer-input").fill("hello ");
    await pageA.getByTestId("composer-input").press("End");
    await pageA.getByTestId("composer-emoji-btn").click();

    const picker = pageA.getByTestId("emoji-picker");
    await expect(picker).toBeVisible();
    await picker.evaluate((node) => {
      node.dispatchEvent(
        new CustomEvent("emoji-click", {
          detail: { unicode: "😀" },
          bubbles: true,
        }),
      );
    });

    await expect(pageA.getByTestId("composer-input")).toHaveValue("hello 😀");
    await pageA.getByTestId("composer-send-btn").click();

    await expect(pageB.getByText("hello 😀", { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    await ctxA.close();
    await ctxB.close();
  });

  test("9.3 image upload → peer sees thumbnail and can open lightbox", async ({
    browser,
  }) => {
    const users = makeUsers("u93");
    const roomName = `img_${users.a.username}`;

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

    const fileInput = pageA.locator('[data-testid="composer-file-input"]');
    const uploadDone = pageA.waitForResponse(
      (r) => r.url().endsWith("/api/uploads") && r.status() === 201,
    );
    await fileInput.setInputFiles({
      name: "pixel.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await uploadDone;
    await expect(pageA.locator('[data-testid="staged-list"]')).toBeVisible();

    await pageA.getByTestId("composer-send-btn").click();

    const thumbB = pageB.locator('[data-testid="att-image-thumb"]').first();
    await expect(thumbB).toBeVisible({ timeout: 10_000 });

    await thumbB.click();
    await expect(pageB.getByRole("dialog")).toBeVisible();
    await expect(
      pageB.getByRole("dialog").getByRole("link", { name: /Download/i }),
    ).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });

  test("9.4 oversized upload rejected server-side; reasonable file accepted", async ({
    browser,
  }) => {
    const users = makeUsers("u94");

    const ctx = await browser.newContext({ baseURL: e2eBaseURL() });
    const page = await ctx.newPage();
    await register(page, users.a);

    const api = await pwRequest.newContext({
      baseURL: e2eBaseURL(),
      storageState: await ctx.storageState(),
    });
    try {
      const big = Buffer.alloc(25 * 1024 * 1024, 0x42);
      const rejected = await api.post("/api/uploads", {
        multipart: {
          file: {
            name: "big.bin",
            mimeType: "application/octet-stream",
            buffer: big,
          },
        },
      });
      expect(rejected.status()).toBe(413);

      const ok = Buffer.alloc(1024 * 1024, 0x41);
      const accepted = await api.post("/api/uploads", {
        multipart: {
          file: {
            name: "fine.bin",
            mimeType: "application/octet-stream",
            buffer: ok,
          },
        },
      });
      expect(accepted.status()).toBe(201);
      const { id } = (await accepted.json()) as { id: string };

      const fetched = await api.get(`/api/files/${id}`);
      expect(fetched.status()).toBe(200);
      const disposition = fetched.headers()["content-disposition"];
      expect(disposition).toMatch(/filename\*=UTF-8''fine\.bin/);
    } finally {
      await api.dispose();
    }
    await ctx.close();
  });

  test("9.5 edit and delete are reflected live for peer", async ({
    browser,
  }) => {
    const users = makeUsers("u95");
    const roomName = `ed_${users.a.username}`;

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

    const original = `first-${Date.now()}`;
    await pageA.getByPlaceholder("Message").fill(original);
    await pageA.getByTestId("composer-send-btn").click();

    await expect(pageB.getByText(original, { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    const itemA = pageA
      .locator('[data-testid="message-item"]')
      .filter({ hasText: original });
    await itemA.getByTestId("message-actions-btn").click();
    await pageA.getByTestId("edit-action").click();
    const editedText = `${original}-edited`;
    const editInput = itemA.getByTestId("message-edit-input");
    await editInput.fill(editedText);
    await editInput.press("Enter");

    await expect(pageB.getByText(editedText, { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    const itemB = pageB
      .locator('[data-testid="message-item"]')
      .filter({ hasText: editedText });
    await expect(itemB.getByTestId("edited-badge")).toBeVisible();

    const editedItemA = pageA
      .locator('[data-testid="message-item"]')
      .filter({ hasText: editedText });
    await editedItemA.getByTestId("message-actions-btn").click();
    await pageA.getByTestId("delete-action").click();
    await pageA.getByTestId("delete-confirm").click();

    await expect(
      pageB.locator('[data-testid="message-deleted"]').first(),
    ).toBeVisible({ timeout: 10_000 });

    await ctxA.close();
    await ctxB.close();
  });

  test("9.6 reply: quote renders with preview and author", async ({
    browser,
  }) => {
    const users = makeUsers("u96");
    const roomName = `rep_${users.a.username}`;

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
    await waitForEmptyConversation(pageA);
    await waitForEmptyConversation(pageB);

    const connected = (page: typeof pageA) =>
      expect(page.locator("[data-realtime-status='connected']").first()).toBeVisible({
        timeout: 20_000,
      });
    await connected(pageA);
    await connected(pageB);

    const anchor = `anchor-${Date.now()}`;
    await pageA.getByPlaceholder("Message").fill(anchor);
    await pageA.getByTestId("composer-send-btn").click();
    await expect(pageA.getByText(anchor, { exact: true })).toBeVisible({
      timeout: 10_000,
    });
    await expect(pageB.getByText(anchor, { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    // Peer replies to the anchor
    const targetB = pageB
      .locator('[data-testid="message-item"]')
      .filter({ hasText: anchor });
    await targetB.getByTestId("message-actions-btn").click();
    await pageB.getByTestId("reply-action").click();
    await expect(pageB.getByTestId("reply-banner")).toBeVisible();

    const replyText = `reply-${Date.now()}`;
    await pageB.getByTestId("composer-input").fill(replyText);
    await pageB.getByTestId("composer-send-btn").click();

    const replyItemA = pageA
      .locator('[data-testid="message-item"]')
      .filter({ hasText: replyText });
    await expect(replyItemA.getByTestId("reply-quote")).toBeVisible({
      timeout: 10_000,
    });
    await expect(replyItemA.getByTestId("reply-quote")).toContainText(
      users.a.username,
    );

    await ctxA.close();
    await ctxB.close();
  });

  test("9.7 non-member GET /api/files/:id returns 403", async ({
    browser,
  }) => {
    const users = makeUsers("u97");
    const roomName = `acl_${users.a.username}`;

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    await createPublicRoom(pageA, roomName);
    await openRoomFromCatalog(pageA, roomName);
    const roomId = roomIdFromUrl(pageA.url());

    const apiA = await pwRequest.newContext({
      baseURL: e2eBaseURL(),
      storageState: await ctxA.storageState(),
    });
    const apiB = await pwRequest.newContext({
      baseURL: e2eBaseURL(),
      storageState: await ctxB.storageState(),
    });
    try {
      const convId = await getConvIdForRoom(apiA, roomId);

      // Upload as A, send a message attaching it
      const up = await apiA.post("/api/uploads", {
        multipart: {
          file: {
            name: "secret.txt",
            mimeType: "text/plain",
            buffer: Buffer.from("top secret"),
          },
        },
      });
      expect(up.status()).toBe(201);
      const { id: attId } = (await up.json()) as { id: string };

      const send = await apiA.post(`/api/conversations/${convId}/messages`, {
        headers: { "Content-Type": "application/json" },
        data: { body: "", attachmentIds: [attId] },
      });
      expect(send.status()).toBe(201);

      // B is not a member → must be forbidden
      const denied = await apiB.get(`/api/files/${attId}`);
      expect(denied.status()).toBe(403);

      // A can still fetch
      const allowed = await apiA.get(`/api/files/${attId}`);
      expect(allowed.status()).toBe(200);
    } finally {
      await apiA.dispose();
      await apiB.dispose();
    }

    await ctxA.close();
    await ctxB.close();
  });
});
