import { NextResponse } from "next/server";
import { serializeAuthUser } from "@/lib/auth/serialize";
import { requireSessionUser, touchSessionLastSeen } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  await touchSessionLastSeen();

  return NextResponse.json({
    user: serializeAuthUser(gate.user),
  });
}
