import type { Attachment, Message } from "@prisma/client";

export type AttachmentDto = {
  id: string;
  kind: "image" | "file";
  originalName: string;
  mime: string;
  size: number;
  comment: string | null;
};

export type ReplyToDto =
  | {
      id: string;
      authorId: string;
      authorUsername: string;
      authorDisplayName: string | null;
      bodyPreview: string | null;
      deleted: boolean;
    }
  | { id: string; deleted: true };

export type MessagePayload = {
  id: string;
  conversationId: string;
  authorId: string;
  body: string | null;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  deleted: boolean;
  author: { id: string; username: string; displayName: string | null };
  attachments: AttachmentDto[];
  replyTo: ReplyToDto | null;
};

export type MessageWithRelations = Message & {
  author: { id: string; username: string; displayName: string | null };
  attachments: Attachment[];
  replyTo:
    | (Message & { author: { id: string; username: string; displayName: string | null } })
    | null;
};

export function previewBody(body: string, max = 140): string {
  const trimmed = body.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

export function serializeAttachment(a: Attachment): AttachmentDto {
  return {
    id: a.id,
    kind: a.kind as "image" | "file",
    originalName: a.originalName,
    mime: a.mime,
    size: a.size,
    comment: a.comment,
  };
}

export function serializeMessage(m: MessageWithRelations): MessagePayload {
  const deleted = !!m.deletedAt;
  const replyTo: ReplyToDto | null = m.replyToId
    ? m.replyTo
      ? {
          id: m.replyTo.id,
          authorId: m.replyTo.authorId,
          authorUsername: m.replyTo.author.username,
          authorDisplayName: m.replyTo.author.displayName,
          bodyPreview: m.replyTo.deletedAt ? null : previewBody(m.replyTo.body),
          deleted: !!m.replyTo.deletedAt,
        }
      : { id: m.replyToId, deleted: true }
    : null;

  const attachments = deleted
    ? []
    : m.attachments
        .slice()
        .sort((a, b) =>
          a.createdAt.getTime() === b.createdAt.getTime()
            ? a.id.localeCompare(b.id)
            : a.createdAt.getTime() - b.createdAt.getTime(),
        )
        .map(serializeAttachment);

  return {
    id: m.id,
    conversationId: m.conversationId,
    authorId: m.authorId,
    body: deleted ? null : m.body,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt ? m.editedAt.toISOString() : null,
    deletedAt: m.deletedAt ? m.deletedAt.toISOString() : null,
    deleted,
    author: m.author,
    attachments,
    replyTo: deleted && replyTo && "bodyPreview" in replyTo
      ? {
          id: replyTo.id,
          authorId: replyTo.authorId,
          authorUsername: replyTo.authorUsername,
          authorDisplayName: replyTo.authorDisplayName,
          bodyPreview: null,
          deleted: replyTo.deleted,
        }
      : replyTo,
  };
}

export const messageInclude = {
  author: { select: { id: true, username: true, displayName: true } },
  attachments: true,
  replyTo: {
    include: { author: { select: { id: true, username: true, displayName: true } } },
  },
} as const;
