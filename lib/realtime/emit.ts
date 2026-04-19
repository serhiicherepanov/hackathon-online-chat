import {
  centrifugoBroadcast,
  centrifugoPublish,
  centrifugoUnsubscribe,
} from "@/lib/centrifugo/server";
import { logger } from "@/lib/logger";
import type {
  MemberBannedPayload,
  MemberJoinedPayload,
  MessageCreatedPayload,
  MessageDeletedPayload,
  MessageUpdatedPayload,
  PresenceChangedPayload,
  PresenceStatus,
  RoleChangedPayload,
  RoomAccessRevokedPayload,
  RoomDeletedPayload,
  RoomInvitedPayload,
  RoomUpdatedPayload,
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

export async function publishRoomUpdated(
  conversationId: string,
  payload: RoomUpdatedPayload,
): Promise<void> {
  try {
    await centrifugoPublish(`room:${conversationId}`, payload);
  } catch (err) {
    logger.warn({ err, conversationId }, "publishRoomUpdated failed");
  }
}

export async function publishRoleChanged(
  conversationId: string,
  payload: RoleChangedPayload,
): Promise<void> {
  try {
    await centrifugoPublish(`room:${conversationId}`, payload);
  } catch (err) {
    logger.warn({ err, conversationId }, "publishRoleChanged failed");
  }
}

export async function publishMemberBanned(
  conversationId: string,
  payload: MemberBannedPayload,
): Promise<void> {
  try {
    await centrifugoPublish(`room:${conversationId}`, payload);
  } catch (err) {
    logger.warn({ err, conversationId }, "publishMemberBanned failed");
  }
}

export async function publishMemberJoined(
  conversationId: string,
  payload: MemberJoinedPayload,
): Promise<void> {
  try {
    await centrifugoPublish(`room:${conversationId}`, payload);
  } catch (err) {
    logger.warn({ err, conversationId }, "publishMemberJoined failed");
  }
}

export async function publishRoomInvited(
  targetUserId: string,
  payload: RoomInvitedPayload,
): Promise<void> {
  await publishUserScopedEvent(targetUserId, payload);
}

export async function publishRoomAccessRevoked(
  targetUserId: string,
  payload: RoomAccessRevokedPayload,
): Promise<void> {
  await publishUserScopedEvent(targetUserId, payload);
}

export async function publishRoomDeletedToUser(
  targetUserId: string,
  payload: RoomDeletedPayload,
): Promise<void> {
  await publishUserScopedEvent(targetUserId, payload);
}

export async function publishRoomDeletedToUsers(
  userIds: string[],
  payload: RoomDeletedPayload,
): Promise<void> {
  await broadcastUserScopedEvent(userIds, payload);
}

export async function publishRoomDeletedToRoom(
  conversationId: string,
  payload: RoomDeletedPayload,
): Promise<void> {
  try {
    await centrifugoPublish(`room:${conversationId}`, payload);
  } catch (err) {
    logger.warn({ err, conversationId }, "publishRoomDeletedToRoom failed");
  }
}

export async function unsubscribeUserFromRoomChannel(
  userId: string,
  conversationId: string,
): Promise<void> {
  try {
    await centrifugoUnsubscribe(userId, `room:${conversationId}`);
  } catch (err) {
    logger.warn(
      { err, userId, conversationId },
      "unsubscribeUserFromRoomChannel failed",
    );
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
