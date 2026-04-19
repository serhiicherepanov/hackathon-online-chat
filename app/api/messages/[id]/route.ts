import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { messageInclude, serializeMessage } from "@/lib/messages/serialize";
import { prisma } from "@/lib/prisma";
import {
  getRoomMembershipByConversationId,
  isRoomAdmin,
} from "@/lib/rooms/auth";
import {
  publishMessageDeleted,
  publishMessageUpdated,
} from "@/lib/realtime/emit";
import type {
  MessageDeletedPayload,
  MessageUpdatedPayload,
} from "@/lib/realtime/payloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchBody = z.object({ body: z.string() });

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = patchBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const existing = await prisma.message.findUnique({
    where: { id },
    include: {
      attachments: { select: { id: true } },
      conversation: { select: { type: true, id: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.authorId !== gate.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (existing.deletedAt) {
    return NextResponse.json({ error: "gone" }, { status: 410 });
  }

  const newBody = parsed.data.body.trim();
  if (!newBody && existing.attachments.length === 0) {
    return NextResponse.json({ error: "empty_message" }, { status: 400 });
  }
  if (newBody && Buffer.byteLength(newBody, "utf8") > 3072) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }
  if (newBody === existing.body) {
    return NextResponse.json({ error: "no_op" }, { status: 400 });
  }

  const updated = await prisma.message.update({
    where: { id },
    data: { body: newBody, editedAt: new Date() },
    include: messageInclude,
  });

  const serialized = serializeMessage(updated);
  const payload: MessageUpdatedPayload = {
    type: "message.updated",
    conversationId: existing.conversation.id,
    message: serialized,
  };
  void publishMessageUpdated(
    existing.conversation.type,
    existing.conversation.id,
    payload,
  ).catch(() => undefined);

  return NextResponse.json({ message: serialized }, { status: 200 });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;

  const existing = await prisma.message.findUnique({
    where: { id },
    include: { conversation: { select: { type: true, id: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.deletedAt) {
    return new Response(null, { status: 204 });
  }

  if (existing.authorId !== gate.user.id) {
    if (existing.conversation.type !== "room") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const membership = await getRoomMembershipByConversationId(
      existing.conversation.id,
      gate.user.id,
    );
    if (!membership || !isRoomAdmin(membership.role)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const deletedAt = new Date();
  await prisma.message.update({
    where: { id },
    data: { deletedAt },
  });

  const payload: MessageDeletedPayload = {
    type: "message.deleted",
    conversationId: existing.conversation.id,
    id,
    deletedAt: deletedAt.toISOString(),
  };
  void publishMessageDeleted(
    existing.conversation.type,
    existing.conversation.id,
    payload,
  ).catch(() => undefined);

  return new Response(null, { status: 204 });
}
