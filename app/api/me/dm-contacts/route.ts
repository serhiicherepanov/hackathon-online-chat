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

  const peerIds = rows
    .map((row) =>
      row.conversation.dmParticipants
        .map((participant) => participant.user)
        .find((user) => user.id !== gate.user.id)?.id,
    )
    .filter((userId): userId is string => Boolean(userId));

  const blocks = peerIds.length
    ? await prisma.userBlock.findMany({
        where: {
          OR: [
            { blockerId: gate.user.id, blockedId: { in: peerIds } },
            { blockerId: { in: peerIds }, blockedId: gate.user.id },
          ],
        },
        select: { blockerId: true, blockedId: true },
      })
    : [];

  const frozenPeerIds = new Set(
    blocks.map((block) =>
      block.blockerId === gate.user.id ? block.blockedId : block.blockerId,
    ),
  );

  const contacts = rows.map((row) => {
    const peer = row.conversation.dmParticipants
      .map((p) => p.user)
      .find((u) => u.id !== gate.user.id);
    return {
      conversationId: row.conversationId,
      peer: peer ?? { id: "", username: "unknown" },
      frozen: peer ? frozenPeerIds.has(peer.id) : false,
    };
  });

  return NextResponse.json({ contacts });
}
