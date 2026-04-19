import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { hasActiveRoomBan } from "@/lib/rooms/auth";
import { serializeRoomSummary } from "@/lib/rooms/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const invite = await prisma.roomInvite.findUnique({
    where: { id },
    include: {
      room: {
        select: {
          id: true,
          conversationId: true,
          name: true,
          description: true,
          visibility: true,
        },
      },
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

  const [existingMembership, banned] = await Promise.all([
    prisma.roomMember.findUnique({
      where: {
        roomId_userId: {
          roomId: invite.roomId,
          userId: gate.user.id,
        },
      },
      select: { id: true },
    }),
    hasActiveRoomBan(invite.roomId, gate.user.id),
  ]);

  if (existingMembership) {
    return NextResponse.json({ error: "already_member" }, { status: 409 });
  }

  if (banned) {
    return NextResponse.json({ error: "banned" }, { status: 403 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const currentInvite = await tx.roomInvite.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          roomId: true,
        },
      });
      if (!currentInvite) {
        throw new Error("INVITE_NOT_FOUND");
      }
      if (currentInvite.status !== "pending") {
        throw new Error("INVITE_RESOLVED");
      }

      const room = await tx.room.findUnique({
        where: { id: currentInvite.roomId },
        select: {
          id: true,
          conversationId: true,
          name: true,
          description: true,
          visibility: true,
        },
      });
      if (!room) {
        throw new Error("ROOM_NOT_FOUND");
      }

      const txBan = await tx.roomBan.findUnique({
        where: {
          roomId_userId: {
            roomId: currentInvite.roomId,
            userId: gate.user.id,
          },
        },
        select: { id: true },
      });
      if (txBan) {
        throw new Error("INVITEE_BANNED");
      }

      const txMembership = await tx.roomMember.findUnique({
        where: {
          roomId_userId: {
            roomId: currentInvite.roomId,
            userId: gate.user.id,
          },
        },
        select: { id: true },
      });
      if (txMembership) {
        throw new Error("ALREADY_MEMBER");
      }

      await tx.roomInvite.update({
        where: { id },
        data: {
          status: "accepted",
          respondedAt: new Date(),
        },
      });

      await tx.roomMember.create({
        data: {
          roomId: currentInvite.roomId,
          userId: gate.user.id,
          role: "member",
        },
      });

      return room;
    });

    return NextResponse.json({ room: serializeRoomSummary(result) });
  } catch (err) {
    const code = err instanceof Error ? err.message : "UNKNOWN";
    if (code === "INVITE_NOT_FOUND" || code === "ROOM_NOT_FOUND") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (code === "INVITE_RESOLVED" || code === "ALREADY_MEMBER") {
      return NextResponse.json({ error: "invite_resolved" }, { status: 409 });
    }
    if (code === "INVITEE_BANNED") {
      return NextResponse.json({ error: "banned" }, { status: 403 });
    }
    throw err;
  }
}
