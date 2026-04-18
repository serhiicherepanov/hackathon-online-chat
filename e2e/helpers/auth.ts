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

/**
 * Register via the API instead of the sign-up form. Cookies set on the
 * response propagate to the enclosing BrowserContext (they share a cookie
 * jar with `context.request`), so any page created in that context is
 * already signed in. The sign-up UI itself is covered by its own test
 * (`app/(auth)/sign-up/page.test.tsx`) and the full form flow in smoke
 * specs — there is no need to pay for a full page load in every e2e.
 *
 * This keeps test setup under the 10s per-test budget; driving the form via
 * Playwright routinely costs 1.5-2s per user on a cold prod bundle.
 */
export async function register(page: Page, u: TestUser) {
  const res = await page.context().request.post("/api/auth/register", {
    data: { email: u.email, username: u.username, password: u.password },
  });
  if (!res.ok()) {
    throw new Error(
      `register failed: ${res.status()} ${await res.text().catch(() => "")}`,
    );
  }
  await page.goto("/rooms");
  await page.waitForURL("**/rooms", { timeout: 30_000 });
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
