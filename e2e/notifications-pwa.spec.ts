import { expect, test } from "@playwright/test";
import { e2eBaseURL, makeUsers, register } from "./helpers/auth";

test.describe("PWA + notifications shell", () => {
  test("serves manifest with required fields", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toContain("application/manifest+json");
    const json = (await res.json()) as {
      name: string;
      short_name: string;
      start_url: string;
      display: string;
      icons: Array<{ sizes: string; purpose?: string; src: string }>;
    };
    expect(json.name).toBeTruthy();
    expect(json.short_name).toBeTruthy();
    expect(json.start_url).toBe("/");
    expect(json.display).toBe("standalone");
    const sizes = new Set(json.icons.map((i) => i.sizes));
    expect(sizes.has("192x192")).toBe(true);
    expect(sizes.has("512x512")).toBe(true);
    expect(json.icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  test("serves service worker with Service-Worker-Allowed: /", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.status()).toBe(200);
    const h = res.headers();
    expect(h["service-worker-allowed"]).toBe("/");
    expect(h["content-type"] ?? "").toMatch(/javascript/);
  });

  test("serves offline fallback page", async ({ request }) => {
    const res = await request.get("/offline.html");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.toLowerCase()).toContain("offline");
    expect(body).toMatch(/retry/i);
  });

  test("root HTML links manifest, theme-color, and apple-touch-icon", async ({
    request,
  }) => {
    const res = await request.get("/");
    const body = await res.text();
    expect(body).toContain('rel="manifest"');
    expect(body).toContain("theme-color");
    expect(body).toContain("apple-touch-icon");
  });

  test("settings page renders notifications card and mute UI works", async ({
    browser,
  }) => {
    test.slow();
    const users = makeUsers("n");
    const ctx = await browser.newContext({ baseURL: e2eBaseURL() });
    const page = await ctx.newPage();
    await register(page, users.a);
    await page.goto("/settings");

    const card = page.getByTestId("settings-notifications-card");
    await expect(card).toBeVisible({ timeout: 15_000 });

    await page.getByTestId("mute-1h").click();
    await expect(page.getByTestId("resume-notifications")).toBeVisible();
    await page.getByTestId("resume-notifications").click();
    await expect(page.getByTestId("mute-1h")).toBeVisible();

    await ctx.close();
  });

  test("push subscribe endpoint requires auth", async ({ request }) => {
    const res = await request.post("/api/push/subscribe", {
      data: {
        endpoint: "https://push.example.com/abc",
        keys: { p256dh: "a", auth: "b" },
      },
    });
    expect(res.status()).toBe(401);
  });
});
