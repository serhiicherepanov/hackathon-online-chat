import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { assertMember } from "@/lib/conversations/access";
import { onUserChannelSubscribed } from "@/lib/presence/reconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    channel: z.string(),
    user: z.string(),
  })
  .passthrough();

function proxyAllow() {
  return NextResponse.json({ result: {} });
}

function proxyDeny(message: string) {
  return NextResponse.json(
    {
      error: {
        code: 403,
        message,
        temporary: false,
      },
    },
    { status: 200 },
  );
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return proxyDeny("invalid_json");
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return proxyDeny("validation_error");
  }

  const gate = await requireSessionUser();
  if (!gate.ok) {
    return proxyDeny("unauthorized");
  }

  if (parsed.data.user !== gate.user.id) {
    return proxyDeny("identity_mismatch");
  }

  const channel = parsed.data.channel;
  const userId = gate.user.id;

  if (channel === "presence") {
    return proxyAllow();
  }

  const userMatch = /^user:([^:]+)$/.exec(channel);
  if (userMatch) {
    const uid = userMatch[1];
    if (uid !== userId) return proxyDeny("forbidden");
    void onUserChannelSubscribed(userId);
    return proxyAllow();
  }

  const roomMatch = /^room:([^:]+)$/.exec(channel);
  if (roomMatch) {
    const convId = roomMatch[1];
    const access = await assertMember(convId, userId);
    if (!access.ok) return proxyDeny("forbidden");
    return proxyAllow();
  }

  const dmMatch = /^dm:([^:]+)$/.exec(channel);
  if (dmMatch) {
    const convId = dmMatch[1];
    const access = await assertMember(convId, userId);
    if (!access.ok) return proxyDeny("forbidden");
    return proxyAllow();
  }

  return proxyDeny("unknown_channel");
}
