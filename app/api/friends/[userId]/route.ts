import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { broadcastUserScopedEvent } from "@/lib/realtime/emit";
import { findFriendshipForPair } from "@/lib/social/relationships";
import { serializeFriendRemovedEvent } from "@/lib/social/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ userId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;
  if (userId === gate.user.id) {
    return NextResponse.json({ error: "self_friend_remove" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const friendship = await findFriendshipForPair(prisma, gate.user.id, target.id);
  if (!friendship || friendship.status !== "accepted") {
    return new NextResponse(null, { status: 204 });
  }

  await prisma.friendship.delete({ where: { id: friendship.id } });

  void Promise.all([
    broadcastUserScopedEvent(
      [gate.user.id],
      serializeFriendRemovedEvent(target),
    ),
    broadcastUserScopedEvent(
      [target.id],
      serializeFriendRemovedEvent(gate.user),
    ),
  ]).catch(() => undefined);

  return new NextResponse(null, { status: 204 });
}
