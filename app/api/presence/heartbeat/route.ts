import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { getPresenceRequestNow } from "@/lib/presence/request-now";
import { recordActivityAndPublish } from "@/lib/presence/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { status, lastActiveAt } = await recordActivityAndPublish(
    gate.user.id,
    getPresenceRequestNow(request),
  );

  return NextResponse.json({
    status,
    lastActiveAt: lastActiveAt.toISOString(),
  });
}
