import { describe, expect, it, vi } from "vitest";
import { resolveUserByIdentifier } from "./resolve-identifier";

function makeDb(findUnique: ReturnType<typeof vi.fn>) {
  return { user: { findUnique } } as never;
}

const CUID = "c" + "a".repeat(24);

describe("resolveUserByIdentifier", () => {
  it("resolves by cuid id", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ id: CUID, username: "bob" });
    const result = await resolveUserByIdentifier(makeDb(findUnique), CUID);
    expect(result).toEqual({ user: { id: CUID, username: "bob" } });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: CUID },
      select: { id: true, username: true },
    });
  });

  it("resolves by email (lowercased)", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ id: "u1", username: "bob" });
    const result = await resolveUserByIdentifier(
      makeDb(findUnique),
      "Bob@Example.com",
    );
    expect(result).toEqual({ user: { id: "u1", username: "bob" } });
    expect(findUnique).toHaveBeenCalledWith({
      where: { email: "bob@example.com" },
      select: { id: true, username: true },
    });
  });

  it("resolves by username", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ id: "u2", username: "alice" });
    const result = await resolveUserByIdentifier(makeDb(findUnique), "alice");
    expect(result).toEqual({ user: { id: "u2", username: "alice" } });
    expect(findUnique).toHaveBeenCalledWith({
      where: { username: "alice" },
      select: { id: true, username: true },
    });
  });

  it("returns user_not_found for unknown identifier", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const result = await resolveUserByIdentifier(
      makeDb(findUnique),
      "ghost",
    );
    expect(result).toEqual({ error: "user_not_found" });
  });

  it("routes a username that looks like a cuid to the id branch", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    await resolveUserByIdentifier(makeDb(findUnique), CUID);
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: CUID },
      select: { id: true, username: true },
    });
  });

  it("returns user_not_found for empty or whitespace identifier", async () => {
    const findUnique = vi.fn();
    expect(await resolveUserByIdentifier(makeDb(findUnique), "")).toEqual({
      error: "user_not_found",
    });
    expect(
      await resolveUserByIdentifier(makeDb(findUnique), "   "),
    ).toEqual({ error: "user_not_found" });
    expect(findUnique).not.toHaveBeenCalled();
  });
});
