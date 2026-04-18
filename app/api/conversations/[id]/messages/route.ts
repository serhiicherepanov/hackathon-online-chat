import { NextResponse } from "next/server";
import { ulid } from "ulid";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { assertMember } from "@/lib/conversations/access";
import { listMessageRecipientUserIds } from "@/lib/conversations/recipients";
import {
  messageInclude,
  serializeMessage,
} from "@/lib/messages/serialize";
import { prisma } from "@/lib/prisma";
import { broadcastUnreadToUsers, publishMessageCreated } from "@/lib/realtime/emit";
import type {
  MessageCreatedPayload,
  UnreadChangedPayload,
} from "@/lib/realtime/payloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postBody = z.object({
  body: z.string().default(""),
  replyToId: z.string().min(1).optional().nullable(),
  attachmentIds: z.array(z.string().min(1)).max(10).optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const access = await assertMember(id, gate.user.id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 404 ? "not_found" : "forbidden" },
      { status: access.status },
    );
  }

  const url = new URL(req.url);
  const before = url.searchParams.get("before");
  const limitRaw = Number(url.searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitRaw)
    ? Math.min(100, Math.max(1, limitRaw))
    : 50;

  const rows = await prisma.message.findMany({
    where: {
      conversationId: id,
      ...(before ? { id: { lt: before } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: messageInclude,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

  return NextResponse.json({
    messages: page.map(serializeMessage),
    nextCursor,
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const access = await assertMember(id, gate.user.id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 404 ? "not_found" : "forbidden" },
      { status: access.status },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = postBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const text = parsed.data.body.trim();
  const attachmentIds = parsed.data.attachmentIds ?? [];

  if (!text && attachmentIds.length === 0) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  if (text && Buffer.byteLength(text, "utf8") > 3072) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  if (parsed.data.replyToId) {
    const target = await prisma.message.findUnique({
      where: { id: parsed.data.replyToId },
      select: { conversationId: true, deletedAt: true },
    });
    if (!target || target.conversationId !== id || target.deletedAt) {
      return NextResponse.json({ error: "invalid_reply_target" }, { status: 400 });
    }
  }

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!conv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const messageId = ulid();

  try {
    await prisma.$transaction(async (tx) => {
      if (attachmentIds.length > 0) {
        const rows = await tx.attachment.findMany({
          where: { id: { in: attachmentIds } },
          select: { id: true, uploaderId: true, messageId: true },
        });
        if (rows.length !== attachmentIds.length) {
          throw new Error("ATT_403");
        }
        for (const a of rows) {
          if (a.uploaderId !== gate.user.id) throw new Error("ATT_403");
          if (a.messageId) throw new Error("ATT_409");
        }
      }

      await tx.message.create({
        data: {
          id: messageId,
          conversationId: id,
          authorId: gate.user.id,
          body: text,
          replyToId: parsed.data.replyToId || null,
        },
      });

      if (attachmentIds.length > 0) {
        await tx.attachment.updateMany({
          where: { id: { in: attachmentIds } },
          data: { messageId },
        });
      }
    });
  } catch (err) {
    const msg = (err as Error).message;
    if (msg === "ATT_403") {
      return NextResponse.json({ error: "attachment_forbidden" }, { status: 403 });
    }
    if (msg === "ATT_409") {
      return NextResponse.json({ error: "attachment_conflict" }, { status: 409 });
    }
    throw err;
  }

  const created = await prisma.message.findUnique({
    where: { id: messageId },
    include: messageInclude,
  });
  if (!created) {
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }

  const serialized = serializeMessage(created);

  const payload: MessageCreatedPayload = {
    type: "message.created",
    conversationId: id,
    message: serialized,
  };

  void publishMessageCreated(conv.type, id, payload).catch(() => undefined);

  const recipients = await listMessageRecipientUserIds(id, gate.user.id);
  if (recipients.length > 0) {
    const unreadPayload: UnreadChangedPayload = {
      type: "unread.changed",
      conversationId: id,
      unreadDelta: 1,
    };
    void broadcastUnreadToUsers(recipients, unreadPayload).catch(() => undefined);
  }

  return NextResponse.json({ message: serialized }, { status: 201 });
}
