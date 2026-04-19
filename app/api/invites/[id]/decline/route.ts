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
  const invite = await prisma.roomInvite.findUnique({
    where: { id },
    select: {
      id: true,
      inviteeId: true,
      status: true,
    },
  });

  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (invite.inviteeId !== gate.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (invite.status !== "pending") {
    return NextResponse.json({ error: "invite_resolved" }, { status: 409 });
  }

  await prisma.roomInvite.update({
    where: { id },
    data: {
      status: "declined",
      respondedAt: new Date(),
    },
  });

  return new NextResponse(null, { status: 204 });
}
