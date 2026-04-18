import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { broadcastUserScopedEvent } from "@/lib/realtime/emit";
import { hasActiveBlockBetween } from "@/lib/social/relationships";
import { serializeFriendAcceptedEvent } from "@/lib/social/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const friendship = await prisma.friendship.findUnique({
    where: { id },
    include: {
      userA: { select: { id: true, username: true } },
      userB: { select: { id: true, username: true } },
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

  if (await hasActiveBlockBetween(prisma, friendship.userAId, friendship.userBId)) {
    return NextResponse.json({ error: "blocked_pair" }, { status: 403 });
  }

  const updated = await prisma.friendship.update({
    where: { id },
    data: { status: "accepted" },
  });

  const userAEvent = serializeFriendAcceptedEvent(updated.id, friendship.userB);
  const userBEvent = serializeFriendAcceptedEvent(updated.id, friendship.userA);

  void Promise.all([
    broadcastUserScopedEvent([friendship.userAId], userAEvent),
    broadcastUserScopedEvent([friendship.userBId], userBEvent),
  ]).catch(() => undefined);

  return NextResponse.json({ friendshipId: updated.id }, { status: 200 });
}
