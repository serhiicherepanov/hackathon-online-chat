import type { Page } from "@playwright/test";

export async function createPublicRoom(page: Page, name: string) {
  await page.getByRole("button", { name: "Create room" }).click();
  await page.locator("#room-name").fill(name);
  await page.getByRole("button", { name: "Create" }).click();
  await page.getByRole("heading", { name: "Public rooms" }).waitFor();
  await page.getByText(name, { exact: true }).first().waitFor({ state: "visible" });
}

export async function searchRoomCatalog(page: Page, query: string) {
  await page.getByPlaceholder("Search rooms…").fill(query);
  await page.waitForTimeout(400);
}

export async function joinRoomFromCatalog(page: Page, roomName: string) {
  const card = page
    .locator(".rounded-md.border")
    .filter({ hasText: roomName })
    .first();
  await card.getByRole("button", { name: "Join" }).click();
}

export async function openRoomFromCatalog(page: Page, roomName: string) {
  const card = page
    .locator(".rounded-md.border")
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
