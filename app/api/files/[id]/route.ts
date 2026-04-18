import { createReadStream, statSync } from "node:fs";
import { Readable } from "node:stream";
import { requireSessionUser } from "@/lib/auth/session";
import { assertMember } from "@/lib/conversations/access";
import { prisma } from "@/lib/prisma";
import { resolveStoredPath } from "@/lib/uploads/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function rfc5987(name: string): string {
  return encodeURIComponent(name)
    .replace(/['()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const { id } = await ctx.params;
  const att = await prisma.attachment.findUnique({
    where: { id },
    include: {
      message: { select: { conversationId: true } },
    },
  });
  if (!att) return new Response("not_found", { status: 404 });

  if (!att.messageId || !att.message) {
    if (att.uploaderId !== gate.user.id) {
      return new Response("forbidden", { status: 403 });
    }
  } else {
    const access = await assertMember(att.message.conversationId, gate.user.id);
    if (!access.ok) {
      return new Response(access.status === 404 ? "not_found" : "forbidden", {
        status: access.status,
      });
    }
  }

  let abs: string;
  try {
    abs = resolveStoredPath(att.storedPath);
  } catch {
    return new Response("forbidden", { status: 403 });
  }

  let size = att.size;
  try {
    size = statSync(abs).size;
  } catch {
    return new Response("not_found", { status: 404 });
  }

  const stream = Readable.toWeb(createReadStream(abs)) as ReadableStream<Uint8Array>;
  const filename = rfc5987(att.originalName);
  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": att.mime,
      "Content-Length": String(size),
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "private, no-store",
    },
  });
}
