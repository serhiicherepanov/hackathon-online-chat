import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { setFocused } from "@/lib/notifications/focused-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({
  conversationId: z.string().min(1).nullable(),
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
  const parsed = body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  setFocused(gate.user.id, parsed.data.conversationId);
  return new Response(null, { status: 204 });
}
