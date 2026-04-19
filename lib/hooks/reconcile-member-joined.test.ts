import { describe, expect, it } from "vitest";
import { reconcileMemberJoined } from "./reconcile-member-joined";
import type { MemberRow } from "@/lib/hooks/use-members";

const base: MemberRow = {
  userId: "user-1",
  username: "alice",
  avatarUrl: null,
  role: "member",
  joinedAt: new Date(2026, 0, 1).toISOString(),
};

describe("reconcileMemberJoined", () => {
  it("appends a brand-new member to the list", () => {
    const next = reconcileMemberJoined([base], {
      ...base,
      userId: "user-2",
      username: "bob",
    });

    expect(next).toHaveLength(2);
    expect(next.map((m) => m.userId)).toEqual(["user-1", "user-2"]);
  });

  it("replaces an existing member entry rather than duplicating it", () => {
    const updated: MemberRow = {
      ...base,
      role: "admin",
    };
    const next = reconcileMemberJoined([base], updated);

    expect(next).toHaveLength(1);
    expect(next[0].role).toBe("admin");
  });

  it("handles an undefined starting list", () => {
    const next = reconcileMemberJoined(undefined, base);
    expect(next).toEqual([base]);
  });
});
