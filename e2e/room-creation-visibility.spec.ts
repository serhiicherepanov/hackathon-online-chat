import { expect, test } from "@playwright/test";
import { makeUsers, register } from "./helpers/auth";
import { createRoomFromCatalog } from "./helpers/rooms";

test.describe("room creation visibility", () => {
  test("creating a private room opens it and keeps it out of the public catalog", async ({
    page,
  }) => {
    const users = makeUsers("rcv");
    const roomName = `private_${Date.now()}`;

    await register(page, users.a);
    await page.goto("/rooms");

    await createRoomFromCatalog(page, {
      name: roomName,
      visibility: "private",
    });

    await expect(page.getByRole("heading", { name: roomName })).toBeVisible();
    await expect(page.locator("aside").getByRole("link", { name: roomName })).toBeVisible();

    await page.goto("/rooms");
    await expect(
      page.getByTestId("room-card").filter({ hasText: roomName }),
    ).toHaveCount(0);

    const privateSection = page.getByTestId("private-rooms-section");
    await expect(privateSection).toContainText(roomName);
    await expect(
      privateSection.locator('[data-room-visibility="private"]').first(),
    ).toBeVisible();
  });
});
