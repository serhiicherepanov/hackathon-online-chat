import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const rows = await prisma.dmParticipant.findMany({
    where: { userId: gate.user.id },
    include: {
      conversation: {
        include: {
          dmParticipants: {
            include: { user: { select: { id: true, username: true } } },
          },
        },
      },
    },
    orderBy: { joinedAt: "asc" },
  });

  const contacts = rows.map((row) => {
    const peer = row.conversation.dmParticipants
      .map((p) => p.user)
      .find((u) => u.id !== gate.user.id);
    return {
      conversationId: row.conversationId,
      peer: peer ?? { id: "", username: "unknown" },
    };
  });

  return NextResponse.json({ contacts });
}
