import { randomBytes } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";
import {
  buildDeletedAccountIdentity,
  planAccountDeletion,
} from "@/lib/account/deletion";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { deleteStoredUpload } from "@/lib/uploads/storage";

export type DeleteAccountResult = Awaited<ReturnType<typeof deleteAccount>>;

export async function deleteAccount(userId: string) {
  const plan = await planAccountDeletion(prisma, userId);
  const deletedPasswordHash = await hashPassword(randomBytes(32).toString("hex"));
  const tombstoneIdentity = buildDeletedAccountIdentity(userId);

  const cleanupRows = await prisma.attachment.findMany({
    where: {
      OR: [
        {
          message: {
            conversationId: {
              in: plan.ownedConversationIds,
            },
          },
        },
        {
          uploaderId: userId,
          messageId: null,
        },
      ],
    },
    select: {
      storedPath: true,
    },
  });

  const cleanupPaths = Array.from(
    new Set(cleanupRows.map((attachment) => attachment.storedPath)),
  );

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({
      where: {
        userId,
      },
    });

    await tx.session.deleteMany({
      where: {
        userId,
      },
    });

    if (plan.ownedConversationIds.length > 0) {
      await tx.conversation.deleteMany({
        where: {
          id: {
            in: plan.ownedConversationIds,
          },
        },
      });
    }

    await tx.roomMember.deleteMany({ where: { userId } });
    await tx.dmParticipant.deleteMany({ where: { userId } });
    await tx.messageRead.deleteMany({ where: { userId } });
    await tx.roomInvite.deleteMany({
      where: {
        OR: [{ inviteeId: userId }, { inviterId: userId }],
      },
    });
    await tx.roomBan.deleteMany({
      where: {
        OR: [{ userId }, { bannedById: userId }],
      },
    });
    await tx.friendship.deleteMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    });
    await tx.userBlock.deleteMany({
      where: {
        OR: [{ blockerId: userId }, { blockedId: userId }],
      },
    });
    await tx.presence.deleteMany({ where: { userId } });
    await tx.attachment.deleteMany({
      where: {
        uploaderId: userId,
        messageId: null,
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: {
        email: tombstoneIdentity.email,
        username: tombstoneIdentity.username,
        displayName: tombstoneIdentity.displayName,
        avatarUrl: null,
        deletedAt: new Date(),
        passwordHash: deletedPasswordHash,
      },
    });
  });

  await Promise.all(
    cleanupPaths.map(async (storedPath) => {
      try {
        await deleteStoredUpload(storedPath);
      } catch (err) {
        logger.warn({ err, userId, storedPath }, "account upload cleanup failed");
      }
    }),
  );

  return {
    ...plan,
    cleanupPaths,
    tombstoneIdentity,
  };
}
