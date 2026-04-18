import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { publishUserScopedEvent } from "@/lib/realtime/emit";
import {
  findFriendshipForPair,
  hasActiveBlockBetween,
  sortUserPair,
} from "@/lib/social/relationships";
import { serializeFriendRequestEvent } from "@/lib/social/serialize";

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
    return NextResponse.json({ error: "self_request" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, username: true },
  });
  if (!target) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  if (await hasActiveBlockBetween(prisma, gate.user.id, target.id)) {
    return NextResponse.json({ error: "blocked_pair" }, { status: 403 });
  }

  const existing = await findFriendshipForPair(prisma, gate.user.id, target.id);
  if (existing?.status === "accepted") {
    return NextResponse.json({ error: "already_friends" }, { status: 409 });
  }
  if (existing?.status === "pending") {
    return NextResponse.json({ error: "request_exists" }, { status: 409 });
  }

  const pair = sortUserPair(gate.user.id, target.id);
  const friendship = await prisma.friendship.create({
    data: {
      userAId: pair.userAId,
      userBId: pair.userBId,
      requestedById: gate.user.id,
      status: "pending",
    },
  });

  void publishUserScopedEvent(
    target.id,
    serializeFriendRequestEvent(friendship.id, gate.user),
  ).catch(() => undefined);

  return NextResponse.json(
    {
      friendshipId: friendship.id,
      peer: target,
    },
    { status: 201 },
  );
}
