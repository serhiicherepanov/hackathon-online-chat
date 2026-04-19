import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionUser = vi.fn();
const findParticipants = vi.fn();
const findBlocks = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dmParticipant: {
      findMany: findParticipants,
    },
    userBlock: {
      findMany: findBlocks,
    },
  },
}));

describe("GET /api/me/dm-contacts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns peers with avatarUrl and block-derived frozen state", async () => {
    requireSessionUser.mockResolvedValue({
      ok: true,
      user: { id: "me" },
    });
    findParticipants.mockResolvedValue([
      {
        conversationId: "conv-1",
        conversation: {
          dmParticipants: [
            { user: { id: "me", username: "me", avatarUrl: null } },
            {
              user: {
                id: "peer-1",
                username: "alice",
                avatarUrl: "https://cdn.test/alice.png",
              },
            },
          ],
        },
      },
      {
        conversationId: "conv-2",
        conversation: {
          dmParticipants: [
            { user: { id: "me", username: "me", avatarUrl: null } },
            { user: { id: "peer-2", username: "bob", avatarUrl: null } },
          ],
        },
      },
    ]);
    findBlocks.mockResolvedValue([{ blockerId: "peer-2", blockedId: "me" }]);

    const { GET } = await import("./route");
    const response = await GET();

    expect(findParticipants).toHaveBeenCalledWith({
      where: { userId: "me" },
      include: {
        conversation: {
          include: {
            dmParticipants: {
              include: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });
    expect(findBlocks).toHaveBeenCalledWith({
      where: {
        OR: [
          { blockerId: "me", blockedId: { in: ["peer-1", "peer-2"] } },
          { blockerId: { in: ["peer-1", "peer-2"] }, blockedId: "me" },
        ],
      },
      select: { blockerId: true, blockedId: true },
    });
    await expect(response.json()).resolves.toEqual({
      contacts: [
        {
          conversationId: "conv-1",
          peer: {
            id: "peer-1",
            username: "alice",
            avatarUrl: "https://cdn.test/alice.png",
          },
          frozen: false,
        },
        {
          conversationId: "conv-2",
          peer: { id: "peer-2", username: "bob", avatarUrl: null },
          frozen: true,
        },
      ],
    });
  });
});
