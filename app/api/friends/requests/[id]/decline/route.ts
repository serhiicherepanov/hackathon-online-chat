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

  const friendship = await prisma.friendship.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      userAId: true,
      userBId: true,
      requestedById: true,
    },
  });
  if (!friendship) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (friendship.status !== "pending") {
    return NextResponse.json({ error: "request_not_pending" }, { status: 409 });
  }

  const recipientUserId =
    friendship.requestedById === friendship.userAId
      ? friendship.userBId
      : friendship.userAId;
  if (recipientUserId !== gate.user.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await prisma.friendship.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
