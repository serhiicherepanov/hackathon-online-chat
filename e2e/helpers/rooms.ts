import type { Page } from "@playwright/test";

export async function createPublicRoom(page: Page, name: string) {
  await page.locator("main").getByRole("button", { name: "Create room" }).click();
  const dialog = page.getByRole("dialog", { name: "Create a public room" });
  await dialog.locator("#room-name").fill(name);
  await dialog.getByRole("button", { name: "Create" }).click();
  await page.getByRole("heading", { name: "Public rooms" }).waitFor();
  await page.getByText(name, { exact: true }).first().waitFor({ state: "visible" });
}

export async function searchRoomCatalog(page: Page, query: string) {
  await page.getByPlaceholder("Search rooms…").fill(query);
  await page.waitForTimeout(400);
}

export async function joinRoomFromCatalog(page: Page, roomName: string) {
  const card = page
    .getByTestId("room-card")
    .filter({ hasText: roomName })
    .first();
  // Wait for the POST /api/rooms/:id/join response before returning. Without
  // this, the test races: clicking "Join" starts an async request but the
  // following step (e.g. an API call that assumes membership, or opening
  // the room) can fire before the server has persisted the RoomMember.
  const joinResponse = page.waitForResponse(
    (res) =>
      /\/api\/rooms\/[^/]+\/join$/.test(new URL(res.url()).pathname) &&
      res.request().method() === "POST",
  );
  await card.getByRole("button", { name: "Join" }).click();
  await joinResponse;
}

export async function openRoomFromCatalog(page: Page, roomName: string) {
  const card = page
    .getByTestId("room-card")
    .filter({ hasText: roomName })
    .first();
  await card.getByRole("link", { name: "Open" }).click();
  await page.waitForURL(/\/rooms\/[^/]+$/, { timeout: 30_000 });
}

export function roomIdFromUrl(pageUrl: string): string {
  const m = pageUrl.match(/\/rooms\/([^/?]+)/);
  if (!m) throw new Error(`Not a room URL: ${pageUrl}`);
  return m[1];
}
