import { z } from "zod";
import type { MessagePayload } from "@/lib/messages/serialize";

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

export type PresenceChangedPayload = {
  type: "presence.changed";
  userId: string;
  online: boolean;
};

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
