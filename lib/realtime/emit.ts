import {
  centrifugoBroadcast,
  centrifugoPublish,
} from "@/lib/centrifugo/server";
import { logger } from "@/lib/logger";
import type {
  MessageCreatedPayload,
  MessageDeletedPayload,
  MessageUpdatedPayload,
  PresenceChangedPayload,
  PresenceStatus,
  SocialEventPayload,
  TypingPayload,
  UnreadChangedPayload,
} from "@/lib/realtime/payloads";

export async function publishPresenceChanged(
  userId: string,
  status: PresenceStatus,
  lastActiveAt?: Date,
): Promise<void> {
  const payload: PresenceChangedPayload = {
    type: "presence.changed",
    userId,
    status,
    online: status !== "offline",
    lastActiveAt: lastActiveAt?.toISOString(),
  };
  try {
    await Promise.all([
      centrifugoPublish("presence", payload),
      centrifugoPublish(`user:${userId}`, payload),
    ]);
  } catch (err) {
    logger.warn({ err, userId, status }, "publishPresenceChanged failed");
  }
}

export async function publishTyping(
  conversationType: "room" | "dm",
  conversationId: string,
  payload: TypingPayload,
): Promise<void> {
  const channel =
    conversationType === "room"
      ? `room:${conversationId}`
      : `dm:${conversationId}`;
  try {
    await centrifugoPublish(channel, payload);
  } catch (err) {
    logger.warn({ err, channel }, "publishTyping failed");
  }
}

export async function publishUnreadDelta(
  targetUserId: string,
  body: UnreadChangedPayload,
): Promise<void> {
  try {
    await centrifugoPublish(`user:${targetUserId}`, body);
  } catch (err) {
    logger.warn({ err, targetUserId }, "publishUnreadDelta failed");
  }
}

export async function publishUserScopedEvent(
  targetUserId: string,
  payload: SocialEventPayload,
): Promise<void> {
  try {
    await centrifugoPublish(`user:${targetUserId}`, payload);
  } catch (err) {
    logger.warn({ err, targetUserId, type: payload.type }, "publishUserScopedEvent failed");
  }
}

export async function broadcastUserScopedEvent(
  userIds: string[],
  payload: SocialEventPayload,
): Promise<void> {
  if (userIds.length === 0) return;
  const channels = userIds.map((userId) => `user:${userId}`);
  try {
    await centrifugoBroadcast(channels, payload);
  } catch (err) {
    logger.warn({ err, userIds, type: payload.type }, "broadcastUserScopedEvent failed");
  }
}

export async function publishUnreadAbsolute(
  targetUserId: string,
  conversationId: string,
  unread: number,
): Promise<void> {
  const payload: UnreadChangedPayload = {
    type: "unread.changed",
    conversationId,
    unread,
  };
  await publishUnreadDelta(targetUserId, payload);
}

export async function publishMessageCreated(
  conversationType: "room" | "dm",
  conversationId: string,
  payload: MessageCreatedPayload,
): Promise<void> {
  const channel =
    conversationType === "room"
      ? `room:${conversationId}`
      : `dm:${conversationId}`;
  try {
    await centrifugoPublish(channel, payload);
  } catch (err) {
    logger.warn({ err, channel }, "publishMessageCreated failed");
  }
}

export async function publishMessageUpdated(
  conversationType: "room" | "dm",
  conversationId: string,
  payload: MessageUpdatedPayload,
): Promise<void> {
  const channel =
    conversationType === "room"
      ? `room:${conversationId}`
      : `dm:${conversationId}`;
  try {
    await centrifugoPublish(channel, payload);
  } catch (err) {
    logger.warn({ err, channel }, "publishMessageUpdated failed");
  }
}

export async function publishMessageDeleted(
  conversationType: "room" | "dm",
  conversationId: string,
  payload: MessageDeletedPayload,
): Promise<void> {
  const channel =
    conversationType === "room"
      ? `room:${conversationId}`
      : `dm:${conversationId}`;
  try {
    await centrifugoPublish(channel, payload);
  } catch (err) {
    logger.warn({ err, channel }, "publishMessageDeleted failed");
  }
}

export async function broadcastUnreadToUsers(
  userIds: string[],
  body: UnreadChangedPayload,
): Promise<void> {
  if (userIds.length === 0) return;
  const channels = userIds.map((id) => `user:${id}`);
  try {
    await centrifugoBroadcast(channels, body);
  } catch (err) {
    logger.warn({ err, userIds }, "broadcastUnreadToUsers failed");
  }
}
