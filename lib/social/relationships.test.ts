import { describe, expect, it, vi } from "vitest";
import {
  findFriendshipForPair,
  getDmFrozenStateForConversation,
  hasActiveBlockBetween,
  sortUserPair,
} from "./relationships";

describe("sortUserPair", () => {
  it("keeps an already sorted pair stable", () => {
    expect(sortUserPair("a-user", "b-user")).toEqual({
      userAId: "a-user",
      userBId: "b-user",
    });
  });

  it("sorts pair keys lexicographically", () => {
    expect(sortUserPair("z-user", "a-user")).toEqual({
      userAId: "a-user",
      userBId: "z-user",
    });
  });
});

describe("findFriendshipForPair", () => {
  it("looks up friendships by the sorted compound key", async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: "friendship-1" });
    const db = {
      friendship: { findUnique },
    } as const;

    const result = await findFriendshipForPair(db as never, "z-user", "a-user");

    expect(result).toEqual({ id: "friendship-1" });
    expect(findUnique).toHaveBeenCalledWith({
      where: {
        userAId_userBId: {
          userAId: "a-user",
          userBId: "z-user",
        },
      },
    });
  });
});

describe("hasActiveBlockBetween", () => {
  it("returns true when either direction has a block row", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "block-1" });
    const db = {
      userBlock: { findFirst },
    } as const;

    await expect(hasActiveBlockBetween(db as never, "u1", "u2")).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { blockerId: "u1", blockedId: "u2" },
          { blockerId: "u2", blockedId: "u1" },
        ],
      },
      select: { id: true },
    });
  });

  it("returns false when no block row exists", async () => {
    const db = {
      userBlock: { findFirst: vi.fn().mockResolvedValue(null) },
    } as const;

    await expect(hasActiveBlockBetween(db as never, "u1", "u2")).resolves.toBe(false);
  });
});

describe("getDmFrozenStateForConversation", () => {
  it("stays writable when the dm has fewer than two participants", async () => {
    const db = {
      dmParticipant: {
        findMany: vi.fn().mockResolvedValue([{ userId: "u1" }]),
      },
    } as const;

    await expect(
      getDmFrozenStateForConversation(db as never, "conv-1"),
    ).resolves.toEqual({
      frozen: false,
      participantUserIds: ["u1"],
    });
  });

  it("derives frozen state from pairwise block checks", async () => {
    const db = {
      dmParticipant: {
        findMany: vi.fn().mockResolvedValue([{ userId: "u1" }, { userId: "u2" }]),
      },
      userBlock: {
        findFirst: vi.fn().mockResolvedValue({ id: "block-1" }),
      },
    } as const;

    await expect(
      getDmFrozenStateForConversation(db as never, "conv-1"),
    ).resolves.toEqual({
      frozen: true,
      participantUserIds: ["u1", "u2"],
    });
  });
});
