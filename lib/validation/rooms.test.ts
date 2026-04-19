import { describe, it, expect } from "vitest";
import { createRoomBody, createRoomInviteBody, updateRoomBody } from "./rooms";

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

describe("updateRoomBody", () => {
  it("requires an explicit visibility value", () => {
    expect(
      updateRoomBody.safeParse({
        name: "general",
        description: "updated",
      }).success,
    ).toBe(false);
  });

  it("accepts nullable descriptions for clearing room details", () => {
    const parsed = updateRoomBody.parse({
      name: "general",
      description: null,
      visibility: "private",
    });
    expect(parsed.description).toBeNull();
    expect(parsed.visibility).toBe("private");
  });
});

describe("createRoomInviteBody", () => {
  it("accepts a valid username", () => {
    expect(createRoomInviteBody.parse({ username: "alice" }).username).toBe("alice");
  });

  it("rejects blank usernames", () => {
    expect(createRoomInviteBody.safeParse({ username: "" }).success).toBe(false);
  });
});
