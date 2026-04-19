import { describe, expect, it, vi } from "vitest";
import {
  assertRoomRole,
  checkInviteEligibility,
  hasRoomRole,
  isRoomAdmin,
  isRoomOwner,
} from "./auth";

describe("room role helpers", () => {
  it("treats only owner as owner", () => {
    expect(isRoomOwner("owner")).toBe(true);
    expect(isRoomOwner("admin")).toBe(false);
    expect(isRoomOwner("member")).toBe(false);
  });

  it("treats owner and admin as moderators", () => {
    expect(isRoomAdmin("owner")).toBe(true);
    expect(isRoomAdmin("admin")).toBe(true);
    expect(isRoomAdmin("member")).toBe(false);
  });

  it("compares roles by moderation rank", () => {
    expect(hasRoomRole("owner", "member")).toBe(true);
    expect(hasRoomRole("admin", "member")).toBe(true);
    expect(hasRoomRole("member", "admin")).toBe(false);
  });
});

describe("assertRoomRole", () => {
  it("returns forbidden when the caller is not a room member", async () => {
    const db = {
      roomMember: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as const;

    await expect(assertRoomRole("room-1", "user-1", "member", db as never)).resolves
      .toEqual({
        ok: false,
        status: 403,
      });
  });

  it("returns forbidden when the caller role is too weak", async () => {
    const membership = {
      role: "member",
      room: {
        id: "room-1",
        conversationId: "conv-1",
        name: "General",
        description: null,
        visibility: "public",
      },
    };
    const db = {
      roomMember: {
        findUnique: vi.fn().mockResolvedValue(membership),
      },
    } as const;

    await expect(assertRoomRole("room-1", "user-1", "admin", db as never)).resolves
      .toEqual({
        ok: false,
        status: 403,
      });
  });

  it("returns the membership when the caller satisfies the required role", async () => {
    const membership = {
      id: "member-1",
      userId: "user-1",
      role: "admin",
      joinedAt: new Date("2026-04-19T10:00:00Z"),
      room: {
        id: "room-1",
        conversationId: "conv-1",
        name: "General",
        description: null,
        visibility: "public",
      },
    };
    const db = {
      roomMember: {
        findUnique: vi.fn().mockResolvedValue(membership),
      },
    } as const;

    await expect(assertRoomRole("room-1", "user-1", "member", db as never)).resolves
      .toEqual({
        ok: true,
        membership,
      });
  });
});

describe("checkInviteEligibility", () => {
  function makeDb(overrides?: Partial<Record<string, unknown>>) {
    return {
      room: {
        findUnique: vi.fn().mockResolvedValue({
          id: "room-1",
          conversationId: "conv-1",
          name: "Private room",
          description: null,
          visibility: "private",
        }),
      },
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-2",
          username: "alice",
        }),
      },
      roomMember: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      roomBan: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      roomInvite: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      ...overrides,
    };
  }

  it("rejects missing rooms", async () => {
    const db = makeDb({
      room: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    await expect(
      checkInviteEligibility("room-1", "user-1", "alice", db as never),
    ).resolves.toEqual({
      ok: false,
      reason: "room_not_found",
    });
  });

  it("rejects public rooms", async () => {
    const db = makeDb({
      room: {
        findUnique: vi.fn().mockResolvedValue({
          id: "room-1",
          conversationId: "conv-1",
          name: "General",
          description: null,
          visibility: "public",
        }),
      },
    });

    await expect(
      checkInviteEligibility("room-1", "user-1", "alice", db as never),
    ).resolves.toEqual({
      ok: false,
      reason: "room_is_public",
    });
  });

  it("rejects inviting yourself", async () => {
    const db = makeDb({
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          username: "owner",
        }),
      },
    });

    await expect(
      checkInviteEligibility("room-1", "user-1", "owner", db as never),
    ).resolves.toEqual({
      ok: false,
      reason: "cannot_invite_self",
    });
  });

  it("rejects users who are already members", async () => {
    const db = makeDb({
      roomMember: {
        findUnique: vi.fn().mockResolvedValue({ id: "member-1" }),
      },
    });

    await expect(
      checkInviteEligibility("room-1", "user-1", "alice", db as never),
    ).resolves.toEqual({
      ok: false,
      reason: "already_member",
    });
  });

  it("rejects banned users before creating an invite", async () => {
    const db = makeDb({
      roomBan: {
        findUnique: vi.fn().mockResolvedValue({ id: "ban-1" }),
      },
    });

    await expect(
      checkInviteEligibility("room-1", "user-1", "alice", db as never),
    ).resolves.toEqual({
      ok: false,
      reason: "banned",
    });
  });

  it("rejects duplicate pending invites", async () => {
    const db = makeDb({
      roomInvite: {
        findFirst: vi.fn().mockResolvedValue({ id: "invite-1" }),
      },
    });

    await expect(
      checkInviteEligibility("room-1", "user-1", "alice", db as never),
    ).resolves.toEqual({
      ok: false,
      reason: "duplicate_pending",
    });
  });

  it("returns the room and invitee when the invite is allowed", async () => {
    const db = makeDb();

    await expect(
      checkInviteEligibility("room-1", "user-1", "alice", db as never),
    ).resolves.toEqual({
      ok: true,
      room: {
        id: "room-1",
        conversationId: "conv-1",
        name: "Private room",
        description: null,
        visibility: "private",
      },
      invitee: {
        id: "user-2",
        username: "alice",
      },
      pendingInviteId: null,
    });
  });
});
