import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { reconcileUserPresence } from "@/lib/presence/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  void reconcileUserPresence(gate.user.id);

  return new NextResponse(null, { status: 202 });
}
