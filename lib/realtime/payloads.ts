export type MessageCreatedPayload = {
  type: "message.created";
  conversationId: string;
  message: {
    id: string;
    conversationId: string;
    authorId: string;
    body: string;
    createdAt: string;
    author: { id: string; username: string };
  };
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
