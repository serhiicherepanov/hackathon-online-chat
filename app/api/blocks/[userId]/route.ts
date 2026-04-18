import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { broadcastUserScopedEvent } from "@/lib/realtime/emit";
import { hasActiveBlockBetween } from "@/lib/social/relationships";
import {
  serializeBlockRemovedEvent,
  serializeDmFrozenEvent,
} from "@/lib/social/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ userId: string }> };

export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { userId } = await ctx.params;
  if (userId === gate.user.id) {
    return NextResponse.json({ error: "self_unblock" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const dmKey = [gate.user.id, target.id].sort().join(":");

  const result = await prisma.$transaction(async (tx) => {
    const existingBlock = await tx.userBlock.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: gate.user.id,
          blockedId: target.id,
        },
      },
    });

    if (!existingBlock) {
      return { removed: false, conversationId: null as string | null };
    }

    await tx.userBlock.delete({ where: { id: existingBlock.id } });

    const conversation = await tx.conversation.findUnique({
      where: { dmKey },
      select: { id: true },
    });

    return {
      removed: true,
      conversationId: conversation?.id ?? null,
    };
  });

  if (result.removed) {
    const publishJobs: Promise<void>[] = [
      broadcastUserScopedEvent(
        [gate.user.id],
        serializeBlockRemovedEvent(target),
      ),
      broadcastUserScopedEvent(
        [target.id],
        serializeBlockRemovedEvent(gate.user),
      ),
    ];

    if (result.conversationId) {
      const stillFrozen = await hasActiveBlockBetween(prisma, gate.user.id, target.id);
      publishJobs.push(
        broadcastUserScopedEvent(
          [gate.user.id, target.id],
          serializeDmFrozenEvent(result.conversationId, stillFrozen),
        ),
      );
    }

    void Promise.all(publishJobs).catch(() => undefined);
  }

  return new NextResponse(null, { status: 204 });
}
