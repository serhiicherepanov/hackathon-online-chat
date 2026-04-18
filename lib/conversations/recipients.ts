import { prisma } from "@/lib/prisma";

export async function listMessageRecipientUserIds(
  conversationId: string,
  exceptUserId: string,
): Promise<string[]> {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { type: true },
  });
  if (!conv) return [];

  if (conv.type === "room") {
    const members = await prisma.roomMember.findMany({
      where: { room: { conversationId } },
      select: { userId: true },
    });
    return members.map((m) => m.userId).filter((id) => id !== exceptUserId);
  }

  const participants = await prisma.dmParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return participants.map((p) => p.userId).filter((id) => id !== exceptUserId);
}
