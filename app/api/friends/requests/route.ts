import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { dispatchFriendRequestPush } from "@/lib/notifications/hooks";
import { publishUserScopedEvent } from "@/lib/realtime/emit";
import {
  findFriendshipForPair,
  hasActiveBlockBetween,
  sortUserPair,
} from "@/lib/social/relationships";
import { resolveUserByIdentifier } from "@/lib/social/resolve-identifier";
import { serializeFriendRequestEvent } from "@/lib/social/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// `userId` is accepted as a legacy alias for `identifier` (see
// add-contacts-search-dm design §3). Both branches go through
// `resolveUserByIdentifier` and share the same error shapes.
const postBody = z
  .object({
    identifier: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
  })
  .refine((v) => Boolean(v.identifier ?? v.userId), {
    message: "identifier_required",
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

  const identifier = (parsed.data.identifier ?? parsed.data.userId ?? "").trim();
  const resolved = await resolveUserByIdentifier(prisma, identifier);
  if ("error" in resolved) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }
  const target = resolved.user;
  if (target.id === gate.user.id) {
    return NextResponse.json({ error: "self_request" }, { status: 400 });
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

  void dispatchFriendRequestPush({
    recipientId: target.id,
    sender: { username: gate.user.username },
  }).catch(() => undefined);

  return NextResponse.json(
    {
      friendshipId: friendship.id,
      peer: target,
    },
    { status: 201 },
  );
}
