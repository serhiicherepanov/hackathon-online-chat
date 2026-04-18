import { prisma } from "@/lib/prisma";

export async function assertMember(
  conversationId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: 404 | 403 }> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true },
  });
  if (!conv) return { ok: false, status: 404 };

  if (conv.type === "room") {
    const member = await prisma.roomMember.findFirst({
      where: { userId, room: { conversationId } },
    });
    if (!member) return { ok: false, status: 403 };
    return { ok: true };
  }

  const member = await prisma.dmParticipant.findFirst({
    where: { conversationId, userId },
  });
  if (!member) return { ok: false, status: 403 };
  return { ok: true };
}
