export type AttachmentDto = {
  id: string;
  kind: "image" | "file";
  originalName: string;
  mime: string;
  size: number;
  comment: string | null;
};

export type ReplyToDto = {
  id: string;
  authorId?: string;
  authorUsername?: string;
  bodyPreview?: string | null;
  deleted: boolean;
};

export type MessageDto = {
  id: string;
  conversationId: string;
  authorId: string;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deleted: boolean;
  author: { id: string; username: string };
  attachments: AttachmentDto[];
  replyTo: ReplyToDto | null;
  pending?: boolean;
  error?: string | null;
  correlationId?: string;
};
