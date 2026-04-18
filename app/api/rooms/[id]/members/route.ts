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

  const members = await prisma.roomMember.findMany({
    where: { roomId: room.id },
    include: {
      user: { select: { id: true, username: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({
    members: members.map((m) => ({
      userId: m.userId,
      username: m.user.username,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  });
}
