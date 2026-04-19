import type {
  Room,
  RoomBan,
  RoomInvite,
  RoomInviteStatus,
  RoomMember,
  RoomMemberRole,
  RoomVisibility,
  User,
} from "@prisma/client";

export type RoomSummaryDto = {
  id: string;
  conversationId: string;
  name: string;
  description: string | null;
  visibility: RoomVisibility;
};

export type RoomMemberDto = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: RoomMemberRole;
  joinedAt: string;
};

export type RoomInviteDto = {
  id: string;
  status: RoomInviteStatus;
  createdAt: string;
  respondedAt: string | null;
  room: RoomSummaryDto;
  inviter: {
    id: string;
    username: string;
  };
  invitee: {
    id: string;
    username: string;
  };
};

export type RoomBanDto = {
  userId: string;
  username: string;
  bannedAt: string;
  bannedBy: {
    id: string;
    username: string;
  };
};

type RoomRecord = Pick<
  Room,
  "id" | "conversationId" | "name" | "description" | "visibility"
>;

type RoomMemberRecord = Pick<RoomMember, "userId" | "role" | "joinedAt"> & {
  user: Pick<User, "username" | "avatarUrl">;
};

type RoomInviteRecord = Pick<
  RoomInvite,
  "id" | "status" | "createdAt" | "respondedAt"
> & {
  room: RoomRecord;
  inviter: Pick<User, "id" | "username">;
  invitee: Pick<User, "id" | "username">;
};

type RoomBanRecord = Pick<RoomBan, "userId" | "createdAt"> & {
  user: Pick<User, "username">;
  bannedBy: Pick<User, "id" | "username">;
};

export function serializeRoomSummary(room: RoomRecord): RoomSummaryDto {
  return {
    id: room.id,
    conversationId: room.conversationId,
    name: room.name,
    description: room.description,
    visibility: room.visibility,
  };
}

export function serializeRoomMember(member: RoomMemberRecord): RoomMemberDto {
  return {
    userId: member.userId,
    username: member.user.username,
    avatarUrl: member.user.avatarUrl ?? null,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
  };
}

export function serializeRoomInvite(invite: RoomInviteRecord): RoomInviteDto {
  return {
    id: invite.id,
    status: invite.status,
    createdAt: invite.createdAt.toISOString(),
    respondedAt: invite.respondedAt?.toISOString() ?? null,
    room: serializeRoomSummary(invite.room),
    inviter: {
      id: invite.inviter.id,
      username: invite.inviter.username,
    },
    invitee: {
      id: invite.invitee.id,
      username: invite.invitee.username,
    },
  };
}

export function serializeRoomBan(ban: RoomBanRecord): RoomBanDto {
  return {
    userId: ban.userId,
    username: ban.user.username,
    bannedAt: ban.createdAt.toISOString(),
    bannedBy: {
      id: ban.bannedBy.id,
      username: ban.bannedBy.username,
    },
  };
}
