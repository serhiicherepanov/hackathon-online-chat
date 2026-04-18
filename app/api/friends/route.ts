import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  serializeFriendContact,
  serializeFriendRequest,
  serializeSocialUser,
} from "@/lib/social/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const friendshipInclude = {
  userA: {
    select: {
      id: true,
      username: true,
      presence: { select: { status: true } },
    },
  },
  userB: {
    select: {
      id: true,
      username: true,
      presence: { select: { status: true } },
    },
  },
} as const;

export async function GET() {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const [friendships, blocks] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        OR: [{ userAId: gate.user.id }, { userBId: gate.user.id }],
      },
      include: friendshipInclude,
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    }),
    prisma.userBlock.findMany({
      where: { blockerId: gate.user.id },
      include: {
        blocked: {
          select: { id: true, username: true },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const friends = friendships
    .filter((friendship) => friendship.status === "accepted")
    .map((friendship) => {
      const peerPresence =
        friendship.userAId === gate.user.id
          ? friendship.userB.presence?.status ?? "offline"
          : friendship.userA.presence?.status ?? "offline";

      return serializeFriendContact(friendship, gate.user.id, peerPresence);
    });

  const inboundRequests = friendships
    .filter(
      (friendship) =>
        friendship.status === "pending" && friendship.requestedById !== gate.user.id,
    )
    .map((friendship) => serializeFriendRequest(friendship, gate.user.id));

  const outboundRequests = friendships
    .filter(
      (friendship) =>
        friendship.status === "pending" && friendship.requestedById === gate.user.id,
    )
    .map((friendship) => serializeFriendRequest(friendship, gate.user.id));

  const blockedUsers = blocks.map((block) => ({
    peer: serializeSocialUser(block.blocked),
    blockedAt: block.createdAt.toISOString(),
  }));

  return NextResponse.json({
    friends,
    inboundRequests,
    outboundRequests,
    blockedUsers,
  });
}
