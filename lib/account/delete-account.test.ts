import { beforeEach, describe, expect, it, vi } from "vitest";

const planAccountDeletion = vi.fn();
const buildDeletedAccountIdentity = vi.fn();
const hashPassword = vi.fn();
const attachmentFindMany = vi.fn();
const deleteStoredUpload = vi.fn();
const loggerWarn = vi.fn();

const tx = {
  passwordResetToken: { deleteMany: vi.fn() },
  session: { deleteMany: vi.fn() },
  conversation: { deleteMany: vi.fn() },
  roomMember: { deleteMany: vi.fn() },
  dmParticipant: { deleteMany: vi.fn() },
  messageRead: { deleteMany: vi.fn() },
  roomInvite: { deleteMany: vi.fn() },
  roomBan: { deleteMany: vi.fn() },
  friendship: { deleteMany: vi.fn() },
  userBlock: { deleteMany: vi.fn() },
  presence: { deleteMany: vi.fn() },
  attachment: { deleteMany: vi.fn() },
  user: { update: vi.fn() },
};

const transaction = vi.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx));

vi.mock("@/lib/account/deletion", () => ({
  planAccountDeletion,
  buildDeletedAccountIdentity,
}));

vi.mock("@/lib/auth/password", () => ({
  hashPassword,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    attachment: {
      findMany: attachmentFindMany,
    },
    $transaction: transaction,
  },
}));

vi.mock("@/lib/uploads/storage", () => ({
  deleteStoredUpload,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    warn: loggerWarn,
  },
}));

describe("deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const value of Object.values(tx)) {
      for (const fn of Object.values(value)) {
        fn.mockReset();
      }
    }
    transaction.mockImplementation(async (cb) => cb(tx));
    planAccountDeletion.mockResolvedValue({
      userId: "user-1",
      ownedRoomIds: ["room-owned"],
      ownedConversationIds: ["conv-owned"],
      survivingConversationIds: ["conv-surviving"],
      ownedRoomCount: 1,
      survivingRoomMembershipCount: 1,
      dmConversationCount: 1,
      activeSessionCount: 2,
      tombstoneMessageCount: 5,
      tombstoneIdentity: {
        email: "deleted+user1@example.invalid",
        username: "deleted_user1",
        displayName: "Deleted user",
      },
    });
    buildDeletedAccountIdentity.mockReturnValue({
      email: "deleted+user1@example.invalid",
      username: "deleted_user1",
      displayName: "Deleted user",
    });
    hashPassword.mockResolvedValue("hashed-deleted-password");
    attachmentFindMany.mockResolvedValue([
      { storedPath: "uploads/a.png" },
      { storedPath: "uploads/a.png" },
      { storedPath: "uploads/b.png" },
    ]);
    deleteStoredUpload.mockResolvedValue(undefined);
  });

  it("deletes owned rooms, revokes sessions, and preserves surviving history under a tombstone identity", async () => {
    const { deleteAccount } = await import("./delete-account");

    const result = await deleteAccount("user-1");

    expect(planAccountDeletion).toHaveBeenCalledWith(
      expect.objectContaining({
        attachment: expect.any(Object),
        $transaction: expect.any(Function),
      }),
      "user-1",
    );
    expect(attachmentFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            message: {
              conversationId: {
                in: ["conv-owned"],
              },
            },
          },
          {
            uploaderId: "user-1",
            messageId: null,
          },
        ],
      },
      select: {
        storedPath: true,
      },
    });
    expect(tx.passwordResetToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.conversation.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["conv-owned"] } },
    });
    expect(tx.roomMember.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.dmParticipant.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        email: "deleted+user1@example.invalid",
        username: "deleted_user1",
        displayName: "Deleted user",
        avatarUrl: null,
        deletedAt: expect.any(Date),
        passwordHash: "hashed-deleted-password",
      },
    });
    expect(deleteStoredUpload).toHaveBeenCalledTimes(2);
    expect(deleteStoredUpload).toHaveBeenNthCalledWith(1, "uploads/a.png");
    expect(deleteStoredUpload).toHaveBeenNthCalledWith(2, "uploads/b.png");
    expect(result).toMatchObject({
      userId: "user-1",
      ownedRoomCount: 1,
      tombstoneMessageCount: 5,
      cleanupPaths: ["uploads/a.png", "uploads/b.png"],
      tombstoneIdentity: {
        username: "deleted_user1",
      },
    });
  });

  it("logs cleanup failures but still completes the deletion flow", async () => {
    deleteStoredUpload.mockRejectedValueOnce(new Error("disk gone"));

    const { deleteAccount } = await import("./delete-account");

    await expect(deleteAccount("user-1")).resolves.toMatchObject({
      ownedRoomCount: 1,
    });
    expect(loggerWarn).toHaveBeenCalledWith(
      expect.objectContaining({
        err: expect.any(Error),
        userId: "user-1",
        storedPath: "uploads/a.png",
      }),
      "account upload cleanup failed",
    );
  });
});
