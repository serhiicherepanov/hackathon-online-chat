import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  assertRoomRole,
  getRoomMembership,
} from "@/lib/rooms/auth";
import { serializeRoomSummary } from "@/lib/rooms/serialize";
import {
  publishRoomDeletedToRoom,
  publishRoomDeletedToUsers,
  publishRoomUpdated,
} from "@/lib/realtime/emit";
import type {
  RoomDeletedPayload,
  RoomUpdatedPayload,
} from "@/lib/realtime/payloads";
import { deleteStoredUpload } from "@/lib/uploads/storage";
import { updateRoomBody } from "@/lib/validation/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const membership = await getRoomMembership(id, gate.user.id);
  const room = membership?.room ?? (await prisma.room.findUnique({ where: { id } }));

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (room.visibility === "private" && !membership) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    room: serializeRoomSummary(room),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const auth = await assertRoomRole(id, gate.user.id, "owner");
  if (!auth.ok) {
    return NextResponse.json({ error: "forbidden" }, { status: auth.status });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = updateRoomBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  try {
    const room = await prisma.room.update({
      where: { id },
      data: {
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        visibility: parsed.data.visibility,
      },
    });

    const payload: RoomUpdatedPayload = {
      type: "room.updated",
      room: serializeRoomSummary(room),
    };
    void publishRoomUpdated(room.conversationId, payload).catch(() => undefined);

    return NextResponse.json({ room: payload.room });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "room_name_taken" }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          user: { select: { id: true } },
        },
      },
      conversation: { select: { id: true } },
    },
  });

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const membership = room.members.find((member) => member.userId === gate.user.id);
  if (!membership || membership.role !== "owner") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const attachmentRows = await prisma.attachment.findMany({
    where: {
      message: {
        conversationId: room.conversationId,
      },
    },
    select: { storedPath: true },
  });

  const formerUserIds = room.members.map((member) => member.user.id);
  const roomSummary = serializeRoomSummary(room);

  await prisma.$transaction(async (tx) => {
    await tx.conversation.delete({ where: { id: room.conversationId } });
  });

  await Promise.all(
    attachmentRows.map(async (attachment) => {
      try {
        await deleteStoredUpload(attachment.storedPath);
      } catch (err) {
        logger.warn(
          { err, roomId: room.id, storedPath: attachment.storedPath },
          "room attachment cleanup failed",
        );
      }
    }),
  );

  const payload: RoomDeletedPayload = {
    type: "room.deleted",
    roomId: room.id,
    conversationId: room.conversationId,
    roomName: room.name,
  };
  void Promise.all([
    publishRoomDeletedToRoom(room.conversationId, payload),
    publishRoomDeletedToUsers(formerUserIds, payload),
  ]).catch(() => undefined);

  return new NextResponse(null, { status: 204 });
}
