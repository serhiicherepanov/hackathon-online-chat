import type {
  Friendship,
  Prisma,
  PrismaClient,
  UserBlock,
} from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type SortedUserPair = {
  userAId: string;
  userBId: string;
};

export function sortUserPair(leftUserId: string, rightUserId: string): SortedUserPair {
  return leftUserId.localeCompare(rightUserId) <= 0
    ? { userAId: leftUserId, userBId: rightUserId }
    : { userAId: rightUserId, userBId: leftUserId };
}

export async function findFriendshipForPair(
  db: PrismaLike,
  leftUserId: string,
  rightUserId: string,
): Promise<Friendship | null> {
  const pair = sortUserPair(leftUserId, rightUserId);
  return db.friendship.findUnique({
    where: {
      userAId_userBId: {
        userAId: pair.userAId,
        userBId: pair.userBId,
      },
    },
  });
}

export async function listActiveBlocksForPair(
  db: PrismaLike,
  leftUserId: string,
  rightUserId: string,
): Promise<UserBlock[]> {
  return db.userBlock.findMany({
    where: {
      OR: [
        { blockerId: leftUserId, blockedId: rightUserId },
        { blockerId: rightUserId, blockedId: leftUserId },
      ],
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function hasActiveBlockBetween(
  db: PrismaLike,
  leftUserId: string,
  rightUserId: string,
): Promise<boolean> {
  const block = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: leftUserId, blockedId: rightUserId },
        { blockerId: rightUserId, blockedId: leftUserId },
      ],
    },
    select: { id: true },
  });

  return Boolean(block);
}

export async function isAcceptedFriendship(
  db: PrismaLike,
  leftUserId: string,
  rightUserId: string,
): Promise<boolean> {
  const friendship = await findFriendshipForPair(db, leftUserId, rightUserId);
  return friendship?.status === "accepted";
}

export async function getDmFrozenStateForConversation(
  db: PrismaLike,
  conversationId: string,
): Promise<{ frozen: boolean; participantUserIds: string[] }> {
  const participants = await db.dmParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
    orderBy: { joinedAt: "asc" },
  });

  const participantUserIds = participants.map((participant) => participant.userId);
  if (participantUserIds.length < 2) {
    return { frozen: false, participantUserIds };
  }

  const frozen = await hasActiveBlockBetween(
    db,
    participantUserIds[0],
    participantUserIds[1],
  );

  return { frozen, participantUserIds };
}
