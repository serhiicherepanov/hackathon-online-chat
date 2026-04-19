import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { publishMemberJoined } from "@/lib/realtime/emit";
import { hasActiveRoomBan } from "@/lib/rooms/auth";
import {
  serializeRoomMember,
  serializeRoomSummary,
} from "@/lib/rooms/serialize";

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

  const banned = await hasActiveRoomBan(room.id, gate.user.id);
  if (banned) {
    return NextResponse.json({ error: "banned" }, { status: 403 });
  }

  const existing = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: { roomId: room.id, userId: gate.user.id },
    },
  });

  const member = await prisma.roomMember.upsert({
    where: {
      roomId_userId: { roomId: room.id, userId: gate.user.id },
    },
    create: {
      roomId: room.id,
      userId: gate.user.id,
      role: "member",
    },
    update: {},
    include: {
      user: { select: { username: true, avatarUrl: true } },
    },
  });

  const memberCount = await prisma.roomMember.count({
    where: { roomId: room.id },
  });

  if (!existing) {
    const payload = serializeRoomMember(member);
    await publishMemberJoined(room.conversationId, {
      type: "member.joined",
      conversationId: room.conversationId,
      roomId: room.id,
      member: payload,
    });
  }

  return NextResponse.json({
    room: serializeRoomSummary(room),
    memberCount,
  });
}
