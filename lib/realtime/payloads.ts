import { z } from "zod";
import type { MessagePayload } from "@/lib/messages/serialize";
import type { RoomInviteDto, RoomSummaryDto } from "@/lib/rooms/serialize";
import type {
  BlockCreatedEventPayload,
  BlockRemovedEventPayload,
  DmFrozenEventPayload,
  FriendAcceptedEventPayload,
  FriendRemovedEventPayload,
  FriendRequestEventPayload,
} from "@/lib/social/serialize";

export type MessageCreatedPayload = {
  type: "message.created";
  conversationId: string;
  message: MessagePayload;
};

export type MessageUpdatedPayload = {
  type: "message.updated";
  conversationId: string;
  message: MessagePayload;
};

export type MessageDeletedPayload = {
  type: "message.deleted";
  conversationId: string;
  id: string;
  deletedAt: string;
};

export type UnreadChangedPayload = {
  type: "unread.changed";
  conversationId: string;
  unreadDelta?: number;
  unread?: number;
};

export type PresenceStatus = "online" | "afk" | "offline";

export type PresenceChangedPayload = {
  type: "presence.changed";
  userId: string;
  status: PresenceStatus;
  /** @deprecated kept for backward compatibility with R1 clients; derived from status. */
  online: boolean;
  lastActiveAt?: string;
};

export type TypingPayload = {
  type: "typing";
  conversationId: string;
  userId: string;
  username: string;
  sentAt: string;
};

export type RoomUpdatedPayload = {
  type: "room.updated";
  room: RoomSummaryDto;
};

export type RoleChangedPayload = {
  type: "role.changed";
  conversationId: string;
  roomId: string;
  userId: string;
  role: "owner" | "admin" | "member";
};

export type MemberBannedPayload = {
  type: "member.banned";
  conversationId: string;
  roomId: string;
  userId: string;
};

export type MemberJoinedPayload = {
  type: "member.joined";
  conversationId: string;
  roomId: string;
  member: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    role: "owner" | "admin" | "member";
    joinedAt: string;
  };
};

export type RoomInvitedPayload = {
  type: "room.invited";
  invite: RoomInviteDto;
};

export type RoomAccessRevokedPayload = {
  type: "room.access.revoked";
  room: RoomSummaryDto;
  conversationId: string;
  reason: "banned" | "removed";
};

export type RoomDeletedPayload = {
  type: "room.deleted";
  roomId: string;
  conversationId: string;
  roomName: string;
};

export type NotificationHintPayload = {
  type: "notification.hint";
  category: "dm" | "mention" | "room";
  conversationType: "dm" | "room";
  conversationId: string;
  roomName?: string;
  senderUsername: string;
  bodyPreview: string;
  messageId: string;
};

export type SocialEventPayload =
  | FriendRequestEventPayload
  | FriendAcceptedEventPayload
  | FriendRemovedEventPayload
  | BlockCreatedEventPayload
  | BlockRemovedEventPayload
  | DmFrozenEventPayload
  | RoomInvitedPayload
  | RoomAccessRevokedPayload
  | RoomDeletedPayload;

export const messageUpdatedSchema = z.object({
  type: z.literal("message.updated"),
  conversationId: z.string(),
  message: z.object({ id: z.string() }).passthrough(),
});

export const messageDeletedSchema = z.object({
  type: z.literal("message.deleted"),
  conversationId: z.string(),
  id: z.string(),
  deletedAt: z.string(),
});

export const roleChangedSchema = z.object({
  type: z.literal("role.changed"),
  conversationId: z.string(),
  roomId: z.string(),
  userId: z.string(),
  role: z.enum(["owner", "admin", "member"]),
});

export const memberBannedSchema = z.object({
  type: z.literal("member.banned"),
  conversationId: z.string(),
  roomId: z.string(),
  userId: z.string(),
});

export const memberJoinedSchema = z.object({
  type: z.literal("member.joined"),
  conversationId: z.string(),
  roomId: z.string(),
  member: z.object({
    userId: z.string(),
    username: z.string(),
    avatarUrl: z.string().nullable(),
    role: z.enum(["owner", "admin", "member"]),
    joinedAt: z.string(),
  }),
});
