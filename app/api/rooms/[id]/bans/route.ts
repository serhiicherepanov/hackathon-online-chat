import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRoomMembership, isRoomAdmin } from "@/lib/rooms/auth";
import { serializeRoomBan } from "@/lib/rooms/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const actorMembership = await getRoomMembership(id, gate.user.id);
  const room = actorMembership?.room ?? (await prisma.room.findUnique({ where: { id } }));

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!actorMembership || !isRoomAdmin(actorMembership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const bans = await prisma.roomBan.findMany({
    where: { roomId: id },
    include: {
      user: {
        select: { username: true },
      },
      bannedBy: {
        select: { id: true, username: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    bans: bans.map(serializeRoomBan),
  });
}
