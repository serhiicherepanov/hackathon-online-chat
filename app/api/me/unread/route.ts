import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const rows = await prisma.$queryRaw<
    { conversationId: string; unread: number }[]
  >(Prisma.sql`
    WITH my_conversations AS (
      SELECT c.id
      FROM "Conversation" c
      INNER JOIN "Room" r ON r."conversationId" = c.id
      INNER JOIN "RoomMember" rm ON rm."roomId" = r.id AND rm."userId" = ${gate.user.id}
      WHERE c.type = 'room'
      UNION
      SELECT c.id
      FROM "Conversation" c
      INNER JOIN "DmParticipant" dp ON dp."conversationId" = c.id AND dp."userId" = ${gate.user.id}
      WHERE c.type = 'dm'
    )
    SELECT m."conversationId" AS "conversationId",
           COUNT(*)::int AS unread
    FROM "Message" m
    INNER JOIN my_conversations mc ON mc.id = m."conversationId"
    LEFT JOIN "MessageRead" mr ON mr."conversationId" = m."conversationId" AND mr."userId" = ${gate.user.id}
    WHERE m.id > COALESCE(mr."lastReadMessageId", '')
    GROUP BY m."conversationId"
  `);

  return NextResponse.json({
    unread: rows.map((r) => ({
      conversationId: r.conversationId,
      unread: r.unread,
    })),
  });
}
