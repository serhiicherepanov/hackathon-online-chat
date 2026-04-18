import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { broadcastUserScopedEvent } from "@/lib/realtime/emit";
import {
  findFriendshipForPair,
} from "@/lib/social/relationships";
import {
  serializeBlockCreatedEvent,
  serializeDmFrozenEvent,
  serializeFriendRemovedEvent,
} from "@/lib/social/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postBody = z.object({
  userId: z.string().min(1),
});

export async function POST(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = postBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const targetUserId = parsed.data.userId;
  if (targetUserId === gate.user.id) {
    return NextResponse.json({ error: "self_block" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true },
  });
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const friendship = await findFriendshipForPair(prisma, gate.user.id, target.id);
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

    if (existingBlock) {
      return {
        created: false,
        blockId: existingBlock.id,
        removedFriendship: false,
        conversationId: null as string | null,
      };
    }

    const block = await tx.userBlock.create({
      data: {
        blockerId: gate.user.id,
        blockedId: target.id,
      },
    });

    if (friendship) {
      await tx.friendship.delete({ where: { id: friendship.id } });
    }

    const conversation = await tx.conversation.findUnique({
      where: { dmKey },
      select: { id: true },
    });

    return {
      created: true,
      blockId: block.id,
      removedFriendship: friendship?.status === "accepted",
      conversationId: conversation?.id ?? null,
    };
  });

  if (result.created) {
    const publishJobs: Promise<void>[] = [
      broadcastUserScopedEvent(
        [gate.user.id],
        serializeBlockCreatedEvent(target),
      ),
      broadcastUserScopedEvent(
        [target.id],
        serializeBlockCreatedEvent(gate.user),
      ),
    ];

    if (result.removedFriendship) {
      publishJobs.push(
        broadcastUserScopedEvent(
          [gate.user.id],
          serializeFriendRemovedEvent(target),
        ),
        broadcastUserScopedEvent(
          [target.id],
          serializeFriendRemovedEvent(gate.user),
        ),
      );
    }

    if (result.conversationId) {
      publishJobs.push(
        broadcastUserScopedEvent(
          [gate.user.id, target.id],
          serializeDmFrozenEvent(result.conversationId, true),
        ),
      );
    }

    void Promise.all(publishJobs).catch(() => undefined);
  }

  return NextResponse.json(
    {
      blockId: result.blockId,
      peer: target,
    },
    { status: result.created ? 201 : 200 },
  );
}
