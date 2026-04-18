import type { Page } from "@playwright/test";

export type TestUser = { email: string; username: string; password: string };

/** Playwright config `use.baseURL` is not applied to `browser.newContext()` — pass this explicitly. */
export function e2eBaseURL(): string {
  return process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3080";
}

export function makeUsers(prefix: string): { a: TestUser; b: TestUser } {
  const id = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    a: {
      email: `a_${id}@e2e.test`,
      username: `alice_${id}`,
      password: "password12345",
    },
    b: {
      email: `b_${id}@e2e.test`,
      username: `bob_${id}`,
      password: "password12345",
    },
  };
}

export async function register(page: Page, u: TestUser) {
  await page.goto("/sign-up");
  await page.getByLabel("Email").fill(u.email);
  await page.getByLabel("Username").fill(u.username);
  await page.getByLabel("Password").fill(u.password);
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL("**/rooms", { timeout: 60_000 });
}

export async function signIn(page: Page, u: TestUser) {
  await page.goto("/sign-in");
  await page.getByLabel(/Email or username/).fill(u.username);
  await page.getByLabel("Password").fill(u.password);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL("**/rooms", { timeout: 60_000 });
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Account" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await page.waitForURL("**/sign-in");
}
