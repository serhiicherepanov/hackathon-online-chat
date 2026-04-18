import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const room = await prisma.room.findUnique({
    where: { id },
  });

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (room.visibility !== "public") {
    return NextResponse.json({ error: "private_room" }, { status: 403 });
  }

  await prisma.roomMember.upsert({
    where: {
      roomId_userId: { roomId: room.id, userId: gate.user.id },
    },
    create: {
      roomId: room.id,
      userId: gate.user.id,
      role: "member",
    },
    update: {},
  });

  return NextResponse.json({
    room: {
      id: room.id,
      conversationId: room.conversationId,
      name: room.name,
    },
  });
}
