import { z } from "zod";
import type { MessagePayload } from "@/lib/messages/serialize";
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

export type SocialEventPayload =
  | FriendRequestEventPayload
  | FriendAcceptedEventPayload
  | FriendRemovedEventPayload
  | BlockCreatedEventPayload
  | BlockRemovedEventPayload
  | DmFrozenEventPayload;

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
