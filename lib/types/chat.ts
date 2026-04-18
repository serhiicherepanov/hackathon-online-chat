export type MessageDto = {
  id: string;
  conversationId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: { id: string; username: string };
};
