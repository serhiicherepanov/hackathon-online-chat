import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("app manifest", () => {
  it("returns a valid PWA manifest shape", () => {
    const m = manifest();
    expect(m.name).toBe("Online Chat");
    expect(m.short_name).toBe("Chat");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.background_color).toBeDefined();
    expect(m.theme_color).toBeDefined();
    expect(Array.isArray(m.icons)).toBe(true);
    const sizes = new Set((m.icons ?? []).map((i) => i.sizes));
    expect(sizes.has("192x192")).toBe(true);
    expect(sizes.has("512x512")).toBe(true);
    const hasMaskable = (m.icons ?? []).some((i) => i.purpose === "maskable");
    expect(hasMaskable).toBe(true);
  });
});
