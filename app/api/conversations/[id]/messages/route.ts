import { NextResponse } from "next/server";
import { ulid } from "ulid";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { assertMember } from "@/lib/conversations/access";
import { listMessageRecipientUserIds } from "@/lib/conversations/recipients";
import { prisma } from "@/lib/prisma";
import { broadcastUnreadToUsers, publishMessageCreated } from "@/lib/realtime/emit";
import type { MessageCreatedPayload, UnreadChangedPayload } from "@/lib/realtime/payloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postBody = z.object({
  body: z.string(),
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

  const messages = await prisma.message.findMany({
    where: {
      conversationId: id,
      ...(before ? { id: { lt: before } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    include: {
      author: { select: { id: true, username: true } },
    },
  });

  const hasMore = messages.length > limit;
  const page = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

  return NextResponse.json({
    messages: page.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      authorId: m.authorId,
      body: m.body,
      createdAt: m.createdAt,
      author: m.author,
    })),
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
  if (!text) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }

  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > 3072) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!conv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const messageId = ulid();

  const created = await prisma.message.create({
    data: {
      id: messageId,
      conversationId: id,
      authorId: gate.user.id,
      body: text,
    },
    include: {
      author: { select: { id: true, username: true } },
    },
  });

  const payload: MessageCreatedPayload = {
    type: "message.created",
    conversationId: id,
    message: {
      id: created.id,
      conversationId: created.conversationId,
      authorId: created.authorId,
      body: created.body,
      createdAt: created.createdAt.toISOString(),
      author: created.author,
    },
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

  return NextResponse.json(
    {
      message: {
        id: created.id,
        conversationId: created.conversationId,
        authorId: created.authorId,
        body: created.body,
        createdAt: created.createdAt,
        author: created.author,
      },
    },
    { status: 201 },
  );
}
