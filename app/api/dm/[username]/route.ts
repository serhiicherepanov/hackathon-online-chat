import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ username: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { username } = await ctx.params;
  const normalized = decodeURIComponent(username).trim();
  if (!normalized) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { username: normalized },
    select: { id: true, username: true },
  });

  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  if (target.id === gate.user.id) {
    return NextResponse.json({ error: "self_dm" }, { status: 400 });
  }

  const dmKey = [gate.user.id, target.id].sort().join(":");

  const conversation = await prisma.$transaction(async (tx) => {
    let conv = await tx.conversation.findUnique({ where: { dmKey } });
    if (!conv) {
      conv = await tx.conversation.create({
        data: { type: "dm", dmKey },
      });
      await tx.dmParticipant.createMany({
        data: [
          { conversationId: conv.id, userId: gate.user.id },
          { conversationId: conv.id, userId: target.id },
        ],
      });
    } else {
      await tx.dmParticipant.createMany({
        data: [
          { conversationId: conv.id, userId: gate.user.id },
          { conversationId: conv.id, userId: target.id },
        ],
        skipDuplicates: true,
      });
    }
    return conv;
  });

  return NextResponse.json({
    conversationId: conversation.id,
    peer: { id: target.id, username: target.username },
  });
}
