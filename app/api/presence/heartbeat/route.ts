import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { recordActivityAndPublish } from "@/lib/presence/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { status, lastActiveAt } = await recordActivityAndPublish(gate.user.id);

  return NextResponse.json({
    status,
    lastActiveAt: lastActiveAt.toISOString(),
  });
}
