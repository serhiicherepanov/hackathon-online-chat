import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionUser = vi.fn();
const getRoomMembership = vi.fn();
const isRoomAdmin = vi.fn();
const roomFindUnique = vi.fn();
const userFindUnique = vi.fn();
const roomMemberFindUnique = vi.fn();
const roomBanUpsert = vi.fn();
const roomMemberDeleteMany = vi.fn();
const transaction = vi.fn();
const serializeRoomSummary = vi.fn();
const publishMemberBanned = vi.fn();
const publishRoomAccessRevoked = vi.fn();
const unsubscribeUserFromRoomChannel = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser,
}));

vi.mock("@/lib/rooms/auth", () => ({
  getRoomMembership,
  isRoomAdmin,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    room: {
      findUnique: roomFindUnique,
    },
    user: {
      findUnique: userFindUnique,
    },
    roomMember: {
      findUnique: roomMemberFindUnique,
    },
    $transaction: transaction,
  },
}));

vi.mock("@/lib/rooms/serialize", () => ({
  serializeRoomSummary,
}));

vi.mock("@/lib/realtime/emit", () => ({
  publishMemberBanned,
  publishRoomAccessRevoked,
  unsubscribeUserFromRoomChannel,
}));

describe("POST /api/rooms/:id/bans/:userId", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    transaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) =>
      cb({
        roomBan: {
          upsert: roomBanUpsert,
        },
        roomMember: {
          deleteMany: roomMemberDeleteMany,
        },
      }),
    );
  });

  it("creates a ban and revokes access with the banned reason", async () => {
    const room = {
      id: "room-1",
      conversationId: "conv-1",
      name: "General",
      description: null,
      visibility: "public",
    };
    requireSessionUser.mockResolvedValue({
      ok: true,
      user: { id: "owner-1" },
    });
    getRoomMembership.mockResolvedValue({
      role: "owner",
      room,
    });
    isRoomAdmin.mockReturnValue(true);
    userFindUnique.mockResolvedValue({ id: "user-2" });
    roomMemberFindUnique.mockResolvedValue({ id: "member-row", role: "member" });
    serializeRoomSummary.mockReturnValue({
      id: room.id,
      conversationId: room.conversationId,
      name: room.name,
      description: room.description,
      visibility: room.visibility,
    });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: room.id, userId: "user-2" }),
    });

    expect(roomBanUpsert).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: room.id, userId: "user-2" } },
      create: {
        roomId: room.id,
        userId: "user-2",
        bannedById: "owner-1",
      },
      update: {},
    });
    expect(roomMemberDeleteMany).toHaveBeenCalledWith({
      where: { roomId: room.id, userId: "user-2" },
    });
    expect(publishMemberBanned).toHaveBeenCalledWith(room.conversationId, {
      type: "member.banned",
      conversationId: room.conversationId,
      roomId: room.id,
      userId: "user-2",
    });
    expect(publishRoomAccessRevoked).toHaveBeenCalledWith("user-2", {
      type: "room.access.revoked",
      room: {
        id: room.id,
        conversationId: room.conversationId,
        name: room.name,
        description: room.description,
        visibility: room.visibility,
      },
      conversationId: room.conversationId,
      reason: "banned",
    });
    expect(unsubscribeUserFromRoomChannel).toHaveBeenCalledWith("user-2", room.conversationId);
    expect(response.status).toBe(200);
  });

  it("rejects attempts to ban the owner", async () => {
    const room = {
      id: "room-1",
      conversationId: "conv-1",
      name: "General",
      description: null,
      visibility: "public",
    };
    requireSessionUser.mockResolvedValue({
      ok: true,
      user: { id: "admin-1" },
    });
    getRoomMembership.mockResolvedValue({
      role: "admin",
      room,
    });
    isRoomAdmin.mockReturnValue(true);
    userFindUnique.mockResolvedValue({ id: "owner-1" });
    roomMemberFindUnique.mockResolvedValue({ id: "owner-row", role: "owner" });

    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: room.id, userId: "owner-1" }),
    });

    expect(transaction).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "owner_protected" });
  });
});
