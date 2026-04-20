"use client";

import { useActiveConversationStore } from "@/lib/stores/active-conversation-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { MessagePayload } from "@/lib/messages/serialize";
import type { FriendRequestEventPayload } from "@/lib/social/serialize";
import { maybeShow } from "./foreground";
import { getPrefs } from "./prefs";
import { extractMentions } from "./mentions";

function truncate(text: string, max = 200): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}\u2026`;
}

export async function notifyIncomingMessage(params: {
  conversationType: "dm" | "room";
  conversationId: string;
  roomName?: string;
  senderUsername: string;
  message: MessagePayload;
}): Promise<void> {
  const me = useAuthStore.getState().user;
  if (!me) return;
  if (params.message.author?.id === me.id) return;

  const prefs = await getPrefs();
  const active = useActiveConversationStore.getState().conversationId;
  const body = truncate(params.message.body ?? "");
  const mentioned = extractMentions(params.message.body ?? "").includes(
    me.username.toLowerCase(),
  );

  if (params.conversationType === "dm") {
    maybeShow(
      {
        category: "dm",
        conversationId: params.conversationId,
        title: params.senderUsername,
        body: body || "[attachment]",
        url: `/dm/${params.conversationId}`,
        tag: `dm:${params.conversationId}`,
      },
      { prefs, activeConversationId: active },
    );
    return;
  }

  if (mentioned) {
    maybeShow(
      {
        category: "mention",
        conversationId: params.conversationId,
        title: params.roomName
          ? `${params.senderUsername} mentioned you in ${params.roomName}`
          : `${params.senderUsername} mentioned you`,
        body,
        url: `/rooms/${params.conversationId}`,
        tag: `mention:${params.conversationId}`,
      },
      { prefs, activeConversationId: active },
    );
    return;
  }

  maybeShow(
    {
      category: "room",
      conversationId: params.conversationId,
      title: `${params.roomName ?? "Room"} · ${params.senderUsername}`,
      body: body || "[attachment]",
      url: `/rooms/${params.conversationId}`,
      tag: `room:${params.conversationId}`,
    },
    { prefs, activeConversationId: active },
  );
}

export async function notifyIncomingFriendRequest(
  event: FriendRequestEventPayload,
): Promise<void> {
  const prefs = await getPrefs();
  const active = useActiveConversationStore.getState().conversationId;
  const senderUsername = event.peer?.username ?? "Someone";
  maybeShow(
    {
      category: "friend-request",
      conversationId: null,
      title: "New friend request",
      body: `${senderUsername} sent you a friend request`,
      url: "/contacts",
      tag: `friend-request:${senderUsername}`,
    },
    { prefs, activeConversationId: active },
  );
}
