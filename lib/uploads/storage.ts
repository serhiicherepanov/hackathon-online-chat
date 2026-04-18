import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, open, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

const DEFAULT_UPLOADS_DIR = "/app/uploads";

export type UploadKind = "image" | "file";

export function getUploadsRoot(): string {
  const raw = process.env.UPLOADS_DIR?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_UPLOADS_DIR;
}

/** Maps MIME type to persisted attachment kind (SVG is stored as file). */
export function mimeToKind(mime: string): UploadKind {
  const m = mime.trim().toLowerCase();
  if (m === "image/svg+xml") return "file";
  if (m.startsWith("image/")) return "image";
  return "file";
}

/** Derives a safe extension (leading dot) from the original filename; empty if none or invalid. */
export function sanitizeExtension(filename: string): string {
  const base = path.basename(filename.trim());
  const lastDot = base.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === base.length - 1) return "";
  const raw = base.slice(lastDot);
  if (!/^\.[a-zA-Z0-9._-]{1,32}$/.test(raw)) return "";
  return raw;
}

function normalizeExt(ext: string): string {
  const t = ext.trim();
  if (t === "") return "";
  const withDot = t.startsWith(".") ? t : `.${t}`;
  if (!/^\.[a-zA-Z0-9._-]{0,32}$/.test(withDot)) {
    throw new Error("invalid_ext");
  }
  return withDot;
}

function toNodeReadable(source: Readable | globalThis.ReadableStream): Readable {
  if (source instanceof Readable) return source;
  return Readable.fromWeb(source as Parameters<typeof Readable.fromWeb>[0]);
}

function createSizeLimit(maxBytes: number): Transform {
  let total = 0;
  return new Transform({
    transform(chunk: Buffer, _enc, cb) {
      total += chunk.length;
      if (total > maxBytes) {
        const err = new Error("payload too large");
        (err as NodeJS.ErrnoException).code = "PAYLOAD_TOO_LARGE";
        cb(err);
        return;
      }
      cb(null, chunk);
    },
  });
}

/**
 * Resolves a DB-relative stored path to an absolute path under {@link getUploadsRoot}.
 * Rejects traversal and paths outside the uploads root.
 */
export function resolveStoredPath(storedPath: string): string {
  const root = path.resolve(getUploadsRoot());
  const normalized = storedPath.replace(/^[/\\]+/, "");
  if (!normalized || normalized.includes("..")) {
    throw new Error("invalid_stored_path");
  }
  const resolved = path.resolve(root, normalized);
  const rel = path.relative(root, resolved);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error("invalid_stored_path");
  }
  return resolved;
}

/**
 * Writes an upload stream to `${UPLOADS_DIR}/{yyyy}/{mm}/{uuid}{ext}` and returns
 * DB-relative paths (forward slashes) plus byte size.
 */
export async function writeUpload(
  source: Readable | globalThis.ReadableStream,
  opts: { ext: string; maxBytes: number },
): Promise<{ storedPath: string; relativePath: string; size: number }> {
  const safeExt = normalizeExt(opts.ext);
  const root = path.resolve(getUploadsRoot());
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dir = path.join(root, yyyy, mm);
  await mkdir(dir, { recursive: true });

  const fileName = `${randomUUID()}${safeExt}`;
  const absPath = path.join(dir, fileName);

  const nodeIn = toNodeReadable(source);
  const limiter = createSizeLimit(opts.maxBytes);
  const dest = createWriteStream(absPath, { flags: "w" });
  await pipeline(nodeIn, limiter, dest);

  const syncFh = await open(absPath, "r+");
  try {
    await syncFh.sync();
  } finally {
    await syncFh.close();
  }

  const st = await stat(absPath);
  const relativePath = `${yyyy}/${mm}/${fileName}`;
  return { storedPath: relativePath, relativePath, size: st.size };
}
