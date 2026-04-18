import {
  centrifugoBroadcast,
  centrifugoPublish,
} from "@/lib/centrifugo/server";
import { logger } from "@/lib/logger";
import type {
  MessageCreatedPayload,
  PresenceChangedPayload,
  UnreadChangedPayload,
} from "@/lib/realtime/payloads";

export async function publishPresenceChanged(
  userId: string,
  online: boolean,
): Promise<void> {
  const payload: PresenceChangedPayload = {
    type: "presence.changed",
    userId,
    online,
  };
  try {
    await Promise.all([
      centrifugoPublish("presence", payload),
      centrifugoPublish(`user:${userId}`, payload),
    ]);
  } catch (err) {
    logger.warn({ err, userId, online }, "publishPresenceChanged failed");
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
