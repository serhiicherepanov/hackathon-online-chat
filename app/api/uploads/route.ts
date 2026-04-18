import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  mimeToKind,
  sanitizeExtension,
  writeUpload,
} from "@/lib/uploads/storage";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE = 20 * 1024 * 1024;
const MAX_IMAGE = 3 * 1024 * 1024;
const MAX_COMMENT_BYTES = 500;

export async function POST(req: Request): Promise<Response> {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid_multipart" }, { status: 400 });
  }

  const file = form.get("file");
  const commentRaw = form.get("comment");
  const comment = typeof commentRaw === "string" ? commentRaw : null;

  if (comment && Buffer.byteLength(comment, "utf8") > MAX_COMMENT_BYTES) {
    return NextResponse.json({ error: "comment_too_large" }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const kind = mimeToKind(mime);
  const maxBytes = kind === "image" ? MAX_IMAGE : MAX_FILE;

  if (file.size > 0 && file.size > maxBytes) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  const ext = sanitizeExtension(file.name || "");
  let written: { storedPath: string; relativePath: string; size: number };
  try {
    written = await writeUpload(file.stream(), { ext, maxBytes });
  } catch (err) {
    const e = err as Error & { code?: string };
    if (e.code === "PAYLOAD_TOO_LARGE") {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    logger.warn({ err }, "upload failed");
    return NextResponse.json({ error: "upload_failed" }, { status: 500 });
  }

  const row = await prisma.attachment.create({
    data: {
      uploaderId: gate.user.id,
      originalName: file.name || "file",
      storedPath: written.relativePath,
      mime,
      size: written.size,
      kind,
      comment: comment || null,
    },
  });

  return NextResponse.json(
    {
      id: row.id,
      kind: row.kind,
      originalName: row.originalName,
      mime: row.mime,
      size: row.size,
      comment: row.comment,
    },
    { status: 201 },
  );
}
