import type { Prisma, PrismaClient } from "@prisma/client";

export const TOMBSTONE_DISPLAY_NAME = "Deleted user";

type DeletionStore = PrismaClient | Prisma.TransactionClient;

export type AccountDeletionPlan = {
  userId: string;
  ownedRoomIds: string[];
  ownedConversationIds: string[];
  survivingConversationIds: string[];
  ownedRoomCount: number;
  survivingRoomMembershipCount: number;
  dmConversationCount: number;
  activeSessionCount: number;
  tombstoneMessageCount: number;
  tombstoneIdentity: {
    email: string;
    username: string;
    displayName: string;
  };
};

export function buildDeletedAccountIdentity(userId: string) {
  const suffix = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-12) || "user";
  return {
    email: `deleted+${suffix}@example.invalid`,
    username: `deleted_${suffix}`,
    displayName: TOMBSTONE_DISPLAY_NAME,
  };
}

export async function planAccountDeletion(
  db: DeletionStore,
  userId: string,
): Promise<AccountDeletionPlan> {
  const [ownedRooms, memberships, dmParticipants, activeSessionCount] =
    await Promise.all([
      db.roomMember.findMany({
        where: {
          userId,
          role: "owner",
        },
        select: {
          roomId: true,
          room: {
            select: {
              conversationId: true,
            },
          },
        },
      }),
      db.roomMember.findMany({
        where: {
          userId,
        },
        select: {
          roomId: true,
          role: true,
          room: {
            select: {
              conversationId: true,
            },
          },
        },
      }),
      db.dmParticipant.findMany({
        where: {
          userId,
        },
        select: {
          conversationId: true,
        },
      }),
      db.session.count({
        where: {
          userId,
        },
      }),
    ]);

  const ownedRoomIds = ownedRooms.map((room) => room.roomId);
  const ownedConversationIds = ownedRooms.map((room) => room.room.conversationId);
  const survivingRoomMemberships = memberships.filter(
    (membership) => membership.role !== "owner",
  );
  const survivingConversationIds = Array.from(
    new Set([
      ...survivingRoomMemberships.map((membership) => membership.room.conversationId),
      ...dmParticipants.map((participant) => participant.conversationId),
    ]),
  );

  const tombstoneMessageCount =
    survivingConversationIds.length === 0
      ? 0
      : await db.message.count({
          where: {
            authorId: userId,
            conversationId: {
              in: survivingConversationIds,
            },
          },
        });

  return {
    userId,
    ownedRoomIds,
    ownedConversationIds,
    survivingConversationIds,
    ownedRoomCount: ownedRoomIds.length,
    survivingRoomMembershipCount: survivingRoomMemberships.length,
    dmConversationCount: dmParticipants.length,
    activeSessionCount,
    tombstoneMessageCount,
    tombstoneIdentity: buildDeletedAccountIdentity(userId),
  };
}
