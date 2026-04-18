import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { assertMember } from "@/lib/conversations/access";
import { prisma } from "@/lib/prisma";
import { publishUnreadAbsolute } from "@/lib/realtime/emit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  messageId: z.string().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

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

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    json = {};
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const latest = await prisma.message.findFirst({
    where: { conversationId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { id: true },
  });

  const targetId = parsed.data.messageId ?? latest?.id;
  if (!targetId) {
    return new NextResponse(null, { status: 204 });
  }

  const existing = await prisma.messageRead.findUnique({
    where: {
      conversationId_userId: { conversationId: id, userId: gate.user.id },
    },
  });

  if (existing && existing.lastReadMessageId >= targetId) {
    return new NextResponse(null, { status: 204 });
  }

  await prisma.messageRead.upsert({
    where: {
      conversationId_userId: { conversationId: id, userId: gate.user.id },
    },
    create: {
      conversationId: id,
      userId: gate.user.id,
      lastReadMessageId: targetId,
    },
    update: {
      lastReadMessageId: targetId,
    },
  });

  void publishUnreadAbsolute(gate.user.id, id, 0).catch(() => undefined);

  return new NextResponse(null, { status: 204 });
}
