import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { getPresenceRequestNow } from "@/lib/presence/request-now";
import { centrifugoPresenceClientCount } from "@/lib/centrifugo/server";
import { computePresenceStatus } from "@/lib/presence/transitions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;
  const now = getPresenceRequestNow(req);

  const url = new URL(req.url);
  const raw = url.searchParams.get("userIds") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const capped = ids.slice(0, 1000);

  const rows = capped.length
    ? await prisma.presence.findMany({
        where: { userId: { in: capped } },
        select: { userId: true, lastActiveAt: true },
      })
    : [];
  const byId = new Map(rows.map((row) => [row.userId, row.lastActiveAt]));

  const presence = await Promise.all(
    capped.map(async (userId) => {
      const count = await centrifugoPresenceClientCount(`user:${userId}`);
      const lastActiveAt = byId.get(userId) ?? null;
      const status = computePresenceStatus({
        connectionCount: count,
        lastActiveAt,
        now,
      });
      return {
        userId,
        status,
        online: status !== "offline",
        lastActiveAt: lastActiveAt?.toISOString() ?? null,
      };
    }),
  );

  return NextResponse.json({ presence });
}
