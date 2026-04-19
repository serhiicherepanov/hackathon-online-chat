import { NextResponse } from "next/server";
import { serializeSessionSummary } from "@/lib/auth/serialize";
import {
  getCurrentSessionId,
  requireSessionUser,
  touchSessionLastSeen,
} from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  await touchSessionLastSeen();

  const currentSessionId = await getCurrentSessionId();
  const sessions = await prisma.session.findMany({
    where: {
      userId: gate.user.id,
    },
    orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    sessions: sessions.map((session) =>
      serializeSessionSummary(session, currentSessionId),
    ),
  });
}
