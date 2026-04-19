import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { assertRoomRole } from "@/lib/rooms/auth";
import { serializeRoomMember } from "@/lib/rooms/serialize";
import { publishRoleChanged } from "@/lib/realtime/emit";
import type { RoleChangedPayload } from "@/lib/realtime/payloads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; userId: string }> };

async function changeRole(
  roomId: string,
  actorUserId: string,
  targetUserId: string,
  role: "admin" | "member",
) {
  const auth = await assertRoomRole(roomId, actorUserId, "owner");
  if (!auth.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: auth.status });
  }

  const targetMembership = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: targetUserId,
      },
    },
    include: {
      room: {
        select: {
          id: true,
          conversationId: true,
        },
      },
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (targetMembership.role === "owner") {
    return NextResponse.json({ error: "owner_protected" }, { status: 403 });
  }

  const updated = await prisma.roomMember.update({
    where: { id: targetMembership.id },
    data: { role },
    include: {
      user: { select: { username: true } },
    },
  });

  const payload: RoleChangedPayload = {
    type: "role.changed",
    conversationId: targetMembership.room.conversationId,
    roomId,
    userId: targetUserId,
    role,
  };
  void publishRoleChanged(targetMembership.room.conversationId, payload).catch(
    () => undefined,
  );

  return NextResponse.json({ member: serializeRoomMember(updated) });
}

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id, userId } = await ctx.params;
  return changeRole(id, gate.user.id, userId, "admin");
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id, userId } = await ctx.params;
  return changeRole(id, gate.user.id, userId, "member");
}
