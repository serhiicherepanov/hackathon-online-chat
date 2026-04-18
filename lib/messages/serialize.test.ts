import { describe, expect, it } from "vitest";
import { previewBody } from "./serialize";

describe("previewBody", () => {
  it("returns trimmed body when short", () => {
    expect(previewBody("  hello  world  ")).toBe("hello world");
  });
  it("truncates at 140 chars", () => {
    const long = "a".repeat(300);
    expect(previewBody(long).length).toBe(140);
  });
  it("respects custom max", () => {
    expect(previewBody("abcdef", 3)).toBe("abc");
  });
});
