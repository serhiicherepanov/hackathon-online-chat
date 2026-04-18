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
  if (!membership) {
    return NextResponse.json({ error: "not_member" }, { status: 404 });
  }

  if (membership.role === "owner") {
    return NextResponse.json({ error: "owner_cannot_leave" }, { status: 409 });
  }

  await prisma.roomMember.delete({
    where: { id: membership.id },
  });

  return new NextResponse(null, { status: 204 });
}
