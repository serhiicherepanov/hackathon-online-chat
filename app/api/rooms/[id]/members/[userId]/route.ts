import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRoomMembership, isRoomAdmin } from "@/lib/rooms/auth";
import { serializeRoomSummary } from "@/lib/rooms/serialize";
import {
  publishRoomAccessRevoked,
  unsubscribeUserFromRoomChannel,
} from "@/lib/realtime/emit";
import type { RoomAccessRevokedPayload } from "@/lib/realtime/payloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id, userId } = await ctx.params;
  const actorMembership = await getRoomMembership(id, gate.user.id);
  const room = actorMembership?.room ?? (await prisma.room.findUnique({ where: { id } }));

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!actorMembership || !isRoomAdmin(actorMembership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const targetMembership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: id, userId } },
    select: { id: true, role: true },
  });
  if (!targetMembership) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (targetMembership.role === "owner") {
    return NextResponse.json({ error: "owner_protected" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.roomMember.delete({
      where: { roomId_userId: { roomId: id, userId } },
    });
  });

  const accessRevokedPayload: RoomAccessRevokedPayload = {
    type: "room.access.revoked",
    room: serializeRoomSummary(room),
    conversationId: room.conversationId,
    reason: "removed",
  };

  void Promise.all([
    publishRoomAccessRevoked(userId, accessRevokedPayload),
    unsubscribeUserFromRoomChannel(userId, room.conversationId),
  ]).catch(() => undefined);

  return new NextResponse(null, { status: 204 });
}
