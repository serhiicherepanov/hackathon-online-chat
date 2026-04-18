import { describe, it, expect } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("skips falsy values", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });

  it("merges conflicting Tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles conditional objects and arrays", () => {
    expect(cn("a", { b: true, c: false }, ["d"])).toBe("a b d");
  });
});
