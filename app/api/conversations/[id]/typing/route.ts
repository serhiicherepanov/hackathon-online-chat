import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { assertMember } from "@/lib/conversations/access";
import { prisma } from "@/lib/prisma";
import { publishTyping } from "@/lib/realtime/emit";
import { getDmFrozenStateForConversation } from "@/lib/social/relationships";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const access = await assertMember(id, gate.user.id);
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 404 ? "not_found" : "forbidden" },
      { status: access.status },
    );
  }

  const conv = await prisma.conversation.findUnique({
    where: { id },
    select: { type: true },
  });
  if (!conv) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (conv.type === "dm") {
    const { frozen } = await getDmFrozenStateForConversation(prisma, id);
    if (frozen) {
      return NextResponse.json({ error: "dm_frozen" }, { status: 403 });
    }
  }

  void publishTyping(conv.type, id, {
    type: "typing",
    conversationId: id,
    userId: gate.user.id,
    username: gate.user.username,
    sentAt: new Date().toISOString(),
  }).catch(() => undefined);

  return new NextResponse(null, { status: 202 });
}
