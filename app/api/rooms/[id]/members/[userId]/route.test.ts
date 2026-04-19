import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionUser = vi.fn();
const getRoomMembership = vi.fn();
const isRoomAdmin = vi.fn();
const roomFindUnique = vi.fn();
const roomMemberFindUnique = vi.fn();
const roomMemberDelete = vi.fn();
const transaction = vi.fn();
const serializeRoomSummary = vi.fn();
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
  publishRoomAccessRevoked,
  unsubscribeUserFromRoomChannel,
}));

describe("DELETE /api/rooms/:id/members/:userId", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    transaction.mockImplementation(async (cb: (tx: unknown) => Promise<void>) =>
      cb({
        roomMember: {
          delete: roomMemberDelete,
        },
      }),
    );
  });

  it("removes a member without creating a room ban", async () => {
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
    roomMemberFindUnique.mockResolvedValue({ id: "member-row", role: "member" });
    serializeRoomSummary.mockReturnValue({
      id: room.id,
      conversationId: room.conversationId,
      name: room.name,
      description: room.description,
      visibility: room.visibility,
    });

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: room.id, userId: "user-2" }),
    });

    expect(roomMemberDelete).toHaveBeenCalledWith({
      where: {
        roomId_userId: { roomId: "room-1", userId: "user-2" },
      },
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
      reason: "removed",
    });
    expect(unsubscribeUserFromRoomChannel).toHaveBeenCalledWith("user-2", room.conversationId);
    expect(response.status).toBe(204);
  });

  it("rejects attempts to remove the owner", async () => {
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
    roomMemberFindUnique.mockResolvedValue({ id: "owner-row", role: "owner" });

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: room.id, userId: "owner-1" }),
    });

    expect(transaction).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "owner_protected" });
  });
});
