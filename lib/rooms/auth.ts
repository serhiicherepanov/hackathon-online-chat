import type {
  Prisma,
  RoomInviteStatus,
  RoomMemberRole,
  RoomVisibility,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;

const roomRoleRank: Record<RoomMemberRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export type RoomMembershipRecord = Awaited<
  ReturnType<typeof getRoomMembership>
>;

export type InviteEligibilityFailure =
  | "room_not_found"
  | "room_is_public"
  | "invitee_not_found"
  | "cannot_invite_self"
  | "already_member"
  | "banned"
  | "duplicate_pending";

export function isRoomOwner(role: RoomMemberRole): boolean {
  return role === "owner";
}

export function isRoomAdmin(role: RoomMemberRole): boolean {
  return role === "owner" || role === "admin";
}

export function hasRoomRole(
  actualRole: RoomMemberRole,
  requiredRole: RoomMemberRole,
): boolean {
  return roomRoleRank[actualRole] >= roomRoleRank[requiredRole];
}

export async function getRoomMembership(
  roomId: string,
  userId: string,
  db: DbClient = prisma,
) {
  return db.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    include: {
      room: {
        select: {
          id: true,
          conversationId: true,
          name: true,
          description: true,
          visibility: true,
        },
      },
    },
  });
}

export async function getRoomMembershipByConversationId(
  conversationId: string,
  userId: string,
  db: DbClient = prisma,
) {
  return db.roomMember.findFirst({
    where: { userId, room: { conversationId } },
    include: {
      room: {
        select: {
          id: true,
          conversationId: true,
          name: true,
          description: true,
          visibility: true,
        },
      },
    },
  });
}

export async function hasActiveRoomBan(
  roomId: string,
  userId: string,
  db: DbClient = prisma,
): Promise<boolean> {
  const ban = await db.roomBan.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { id: true },
  });
  return !!ban;
}

export async function getRoomSummary(
  roomId: string,
  db: DbClient = prisma,
): Promise<{
  id: string;
  conversationId: string;
  name: string;
  description: string | null;
  visibility: RoomVisibility;
} | null> {
  return db.room.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      conversationId: true,
      name: true,
      description: true,
      visibility: true,
    },
  });
}

export async function assertRoomRole(
  roomId: string,
  userId: string,
  requiredRole: RoomMemberRole,
  db: DbClient = prisma,
) {
  const membership = await getRoomMembership(roomId, userId, db);
  if (!membership) {
    return { ok: false as const, status: 403 as const };
  }

  if (!hasRoomRole(membership.role, requiredRole)) {
    return { ok: false as const, status: 403 as const };
  }

  return { ok: true as const, membership };
}

export async function checkInviteEligibility(
  roomId: string,
  inviterId: string,
  inviteeUsername: string,
  db: DbClient = prisma,
): Promise<
  | {
      ok: true;
      room: {
        id: string;
        conversationId: string;
        name: string;
        description: string | null;
        visibility: RoomVisibility;
      };
      invitee: { id: string; username: string };
      pendingInviteId: null;
    }
  | {
      ok: false;
      reason: InviteEligibilityFailure;
    }
> {
  const room = await getRoomSummary(roomId, db);
  if (!room) {
    return { ok: false, reason: "room_not_found" };
  }

  if (room.visibility !== "private") {
    return { ok: false, reason: "room_is_public" };
  }

  const invitee = await db.user.findUnique({
    where: { username: inviteeUsername },
    select: { id: true, username: true },
  });
  if (!invitee) {
    return { ok: false, reason: "invitee_not_found" };
  }

  if (invitee.id === inviterId) {
    return { ok: false, reason: "cannot_invite_self" };
  }

  const [existingMembership, existingBan, pendingInvite] = await Promise.all([
    db.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: invitee.id } },
      select: { id: true },
    }),
    db.roomBan.findUnique({
      where: { roomId_userId: { roomId, userId: invitee.id } },
      select: { id: true },
    }),
    db.roomInvite.findFirst({
      where: {
        roomId,
        inviteeId: invitee.id,
        status: "pending" satisfies RoomInviteStatus,
      },
      select: { id: true },
    }),
  ]);

  if (existingMembership) {
    return { ok: false, reason: "already_member" };
  }

  if (existingBan) {
    return { ok: false, reason: "banned" };
  }

  if (pendingInvite) {
    return { ok: false, reason: "duplicate_pending" };
  }

  return {
    ok: true,
    room,
    invitee,
    pendingInviteId: null,
  };
}
