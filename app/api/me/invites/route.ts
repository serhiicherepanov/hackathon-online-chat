import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { serializeRoomInvite } from "@/lib/rooms/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const invites = await prisma.roomInvite.findMany({
    where: {
      inviteeId: gate.user.id,
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
