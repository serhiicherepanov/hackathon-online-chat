import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const memberships = await prisma.roomMember.findMany({
    where: { userId: gate.user.id },
    include: {
      room: true,
    },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({
    rooms: memberships.map((m) => ({
      membershipId: m.id,
      role: m.role,
      joinedAt: m.joinedAt,
      room: {
        id: m.room.id,
        conversationId: m.room.conversationId,
        name: m.room.name,
        description: m.room.description,
        visibility: m.room.visibility,
      },
    })),
  });
}
