import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { MessagePayload } from "@/lib/messages/serialize";
import {
  sendPushToUser,
  type DispatchOptions,
  type PushCategory,
  type PushPayload,
} from "./dispatch";
import { getFocusedConversationId } from "./focused-state";
import { extractMentions } from "./mentions";

function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}\u2026`;
}

async function dispatch(userId: string, payload: PushPayload, opts: DispatchOptions) {
  try {
    await sendPushToUser(userId, payload, opts);
  } catch (err) {
    logger.warn({ err, userId, type: payload.type }, "push dispatch failed");
  }
}

export async function dispatchDmMessagePush(params: {
  recipientId: string;
  conversationId: string;
  sender: { username: string; id: string };
  message: MessagePayload;
}): Promise<void> {
  const body = params.message.body ?? "";
  const focusedOn = getFocusedConversationId(params.recipientId);
  const payload: PushPayload = {
    type: "dm",
    title: params.sender.username,
    body: truncate(body || "[attachment]"),
    url: `/dm/${params.conversationId}`,
    tag: `dm:${params.conversationId}`,
    data: { senderId: params.sender.id, conversationId: params.conversationId },
  };
  await dispatch(params.recipientId, payload, {
    skipBecauseFocused: focusedOn === params.conversationId,
    conversationId: params.conversationId,
  });
}

export async function dispatchRoomMessagePush(params: {
  recipientIds: string[];
  conversationId: string;
  roomName: string;
  sender: { username: string };
  message: MessagePayload;
}): Promise<void> {
  const body = params.message.body ?? "";
  await Promise.all(
    params.recipientIds.map(async (userId) => {
      const focusedOn = getFocusedConversationId(userId);
      const payload: PushPayload = {
        type: "room",
        title: `${params.roomName} · ${params.sender.username}`,
        body: truncate(body || "[attachment]"),
        url: `/rooms/${params.conversationId}`,
        tag: `room:${params.conversationId}`,
        data: { conversationId: params.conversationId },
      };
      await dispatch(userId, payload, {
        skipBecauseFocused: focusedOn === params.conversationId,
        conversationId: params.conversationId,
      });
    }),
  );
}

export async function dispatchMentionPushes(params: {
  authorId: string;
  conversationId: string;
  roomName: string | null;
  sender: { username: string };
  message: MessagePayload;
  candidateRecipientIds: string[];
}): Promise<void> {
  const usernames = extractMentions(params.message.body ?? "");
  if (usernames.length === 0) return;

  const mentioned = await prisma.user.findMany({
    where: {
      username: { in: usernames },
      id: { in: params.candidateRecipientIds, not: params.authorId },
    },
    select: { id: true, username: true },
  });
  if (mentioned.length === 0) return;

  const body = params.message.body ?? "";
  await Promise.all(
    mentioned.map(async (u) => {
      const focusedOn = getFocusedConversationId(u.id);
      const payload: PushPayload = {
        type: "mention",
        title: params.roomName
          ? `${params.sender.username} mentioned you in ${params.roomName}`
          : `${params.sender.username} mentioned you`,
        body: truncate(body),
        url: `/rooms/${params.conversationId}`,
        tag: `mention:${params.conversationId}:${u.id}`,
        data: {
          conversationId: params.conversationId,
          category: "mention" as PushCategory,
        },
      };
      await dispatch(u.id, payload, {
        skipBecauseFocused: focusedOn === params.conversationId,
        conversationId: params.conversationId,
      });
    }),
  );
}

export async function dispatchFriendRequestPush(params: {
  recipientId: string;
  sender: { username: string };
}): Promise<void> {
  const focusedOn = getFocusedConversationId(params.recipientId);
  const payload: PushPayload = {
    type: "friend-request",
    title: "New friend request",
    body: `${params.sender.username} sent you a friend request`,
    url: "/contacts",
    tag: `friend-request:${params.sender.username}`,
  };
  await dispatch(params.recipientId, payload, {
    // Friend requests don't pin to a conversation; suppress only if the user
    // is actively looking at their contacts list (not modeled for now).
    skipBecauseFocused: focusedOn === "/contacts",
  });
}
