import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  checkInviteEligibility,
  getRoomMembership,
  isRoomAdmin,
} from "@/lib/rooms/auth";
import { serializeRoomInvite } from "@/lib/rooms/serialize";
import { publishRoomInvited } from "@/lib/realtime/emit";
import type { RoomInvitedPayload } from "@/lib/realtime/payloads";
import { createRoomInviteBody } from "@/lib/validation/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const actorMembership = await getRoomMembership(id, gate.user.id);
  const room = actorMembership?.room ?? (await prisma.room.findUnique({ where: { id } }));

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!actorMembership || !isRoomAdmin(actorMembership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const invites = await prisma.roomInvite.findMany({
    where: {
      roomId: id,
      status: "pending",
    },
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
      inviter: {
        select: { id: true, username: true },
      },
      invitee: {
        select: { id: true, username: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    invites: invites.map(serializeRoomInvite),
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const actorMembership = await getRoomMembership(id, gate.user.id);
  const room = actorMembership?.room ?? (await prisma.room.findUnique({ where: { id } }));

  if (!room) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!actorMembership || !isRoomAdmin(actorMembership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createRoomInviteBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const eligibility = await checkInviteEligibility(
    id,
    gate.user.id,
    parsed.data.username.trim(),
  );
  if (!eligibility.ok) {
    const status =
      eligibility.reason === "room_not_found" || eligibility.reason === "invitee_not_found"
        ? 404
        : eligibility.reason === "duplicate_pending"
          ? 409
          : 403;
    return NextResponse.json({ error: eligibility.reason }, { status });
  }

  const invite = await prisma.roomInvite.create({
    data: {
      roomId: id,
      inviteeId: eligibility.invitee.id,
      inviterId: gate.user.id,
      status: "pending",
    },
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
      inviter: {
        select: { id: true, username: true },
      },
      invitee: {
        select: { id: true, username: true },
      },
    },
  });

  const payload: RoomInvitedPayload = {
    type: "room.invited",
    invite: serializeRoomInvite(invite),
  };
  void publishRoomInvited(eligibility.invitee.id, payload).catch(() => undefined);

  return NextResponse.json({ invite: payload.invite }, { status: 201 });
}
