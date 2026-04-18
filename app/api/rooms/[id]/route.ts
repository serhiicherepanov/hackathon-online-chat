import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId: gate.user.id },
        select: { id: true },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (room.visibility === "private" && room.members.length === 0) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    room: {
      id: room.id,
      conversationId: room.conversationId,
      name: room.name,
      description: room.description,
      visibility: room.visibility,
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      members: {
        where: { userId: gate.user.id },
      },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const membership = room.members[0];
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.conversation.delete({ where: { id: room.conversationId } });

  return new NextResponse(null, { status: 204 });
}
