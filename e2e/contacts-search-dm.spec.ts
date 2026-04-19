import { test, expect } from "@playwright/test";
import { e2eBaseURL, makeUsers, register } from "./helpers/auth";
import { befriendContexts } from "./helpers/social";

test.describe("contacts-search-dm", () => {
  test("inviting by email adds the user to outbound requests", async ({
    browser,
  }) => {
    const users = makeUsers("csd1");

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    await pageA.goto("/contacts");
    await pageA
      .getByLabel("User id, username, or email")
      .fill(users.b.email);
    await pageA.getByRole("button", { name: "Send request" }).click();

    const outbound = pageA.getByTestId("contacts-outbound");
    await expect(outbound.getByText(users.b.username)).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });

  test("clicking a friend on /contacts opens the DM, sidebar picker reuses it", async ({
    browser,
  }) => {
    const users = makeUsers("csd2");

    const ctxA = await browser.newContext({ baseURL: e2eBaseURL() });
    const ctxB = await browser.newContext({ baseURL: e2eBaseURL() });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await register(pageA, users.a);
    await register(pageB, users.b);

    await befriendContexts(ctxA, ctxB);

    await pageA.goto("/contacts");
    await pageA
      .getByRole("button", { name: `Open DM with ${users.b.username}` })
      .click();
    await pageA.waitForURL(/\/dm\/[^/]+$/, { timeout: 10_000 });
    const dmUrlViaContacts = pageA.url();

    await pageA.goto("/rooms");
    await pageA.getByRole("button", { name: "New DM" }).click();
    const dialog = pageA.getByRole("dialog");
    await expect(dialog.getByText("Start a DM")).toBeVisible();
    await dialog
      .getByRole("button", { name: users.b.username, exact: true })
      .click();
    await pageA.waitForURL(/\/dm\/[^/]+$/, { timeout: 10_000 });
    expect(pageA.url()).toBe(dmUrlViaContacts);

    await ctxA.close();
    await ctxB.close();
  });
});
