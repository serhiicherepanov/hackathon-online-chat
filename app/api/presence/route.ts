import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { centrifugoPresenceClientCount } from "@/lib/centrifugo/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const raw = url.searchParams.get("userIds") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const capped = ids.slice(0, 1000);

  const presence = await Promise.all(
    capped.map(async (userId) => {
      const count = await centrifugoPresenceClientCount(`user:${userId}`);
      return { userId, online: count > 0 };
    }),
  );

  return NextResponse.json({ presence });
}
