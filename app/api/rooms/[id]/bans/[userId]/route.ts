import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { getRoomMembership, isRoomAdmin } from "@/lib/rooms/auth";
import { serializeRoomSummary } from "@/lib/rooms/serialize";
import {
  publishMemberBanned,
  publishRoomAccessRevoked,
  unsubscribeUserFromRoomChannel,
} from "@/lib/realtime/emit";
import type {
  MemberBannedPayload,
  RoomAccessRevokedPayload,
} from "@/lib/realtime/payloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; userId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
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

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const targetMembership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: id, userId } },
    select: { id: true, role: true },
  });
  if (targetMembership?.role === "owner") {
    return NextResponse.json({ error: "owner_protected" }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.roomBan.upsert({
      where: { roomId_userId: { roomId: id, userId } },
      create: {
        roomId: id,
        userId,
        bannedById: gate.user.id,
      },
      update: {},
    });
    await tx.roomMember.deleteMany({
      where: { roomId: id, userId },
    });
  });

  const memberBannedPayload: MemberBannedPayload = {
    type: "member.banned",
    conversationId: room.conversationId,
    roomId: room.id,
    userId,
  };
  const accessRevokedPayload: RoomAccessRevokedPayload = {
    type: "room.access.revoked",
    room: serializeRoomSummary(room),
    conversationId: room.conversationId,
    reason: "banned",
  };

  void Promise.all([
    publishMemberBanned(room.conversationId, memberBannedPayload),
    publishRoomAccessRevoked(userId, accessRevokedPayload),
    unsubscribeUserFromRoomChannel(userId, room.conversationId),
  ]).catch(() => undefined);

  return NextResponse.json({ roomId: room.id, userId });
}

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

  await prisma.roomBan.deleteMany({
    where: { roomId: id, userId },
  });

  return new NextResponse(null, { status: 204 });
}
