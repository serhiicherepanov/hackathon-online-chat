import { describe, it, expect } from "vitest";
import { createRoomBody } from "./rooms";

describe("createRoomBody", () => {
  it("defaults visibility to public", () => {
    const r = createRoomBody.parse({ name: "general" });
    expect(r.visibility).toBe("public");
  });

  it("accepts private visibility", () => {
    const r = createRoomBody.parse({ name: "team", visibility: "private" });
    expect(r.visibility).toBe("private");
  });

  it("rejects names that are too short", () => {
    expect(createRoomBody.safeParse({ name: "a" }).success).toBe(false);
  });

  it("rejects overly long descriptions", () => {
    expect(
      createRoomBody.safeParse({
        name: "general",
        description: "x".repeat(513),
      }).success,
    ).toBe(false);
  });
});
