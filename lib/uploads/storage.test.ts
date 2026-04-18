import { mkdir, readFile, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  mimeToKind,
  resolveStoredPath,
  sanitizeExtension,
  writeUpload,
} from "./storage";

describe("upload storage", () => {
  let prev: string | undefined;
  let tmp: string;

  beforeEach(async () => {
    prev = process.env.UPLOADS_DIR;
    tmp = await mkdtemp(path.join(tmpdir(), "uploads-"));
    process.env.UPLOADS_DIR = tmp;
  });

  afterEach(async () => {
    if (prev === undefined) {
      delete process.env.UPLOADS_DIR;
    } else {
      process.env.UPLOADS_DIR = prev;
    }
    await rm(tmp, { recursive: true, force: true });
  });

  it("resolveStoredPath resolves a safe relative path", async () => {
    const rel = "2026/04/abc.png";
    const abs = path.join(tmp, "2026", "04", "abc.png");
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, "x");
    expect(resolveStoredPath(rel)).toBe(abs);
  });

  it("resolveStoredPath rejects traversal", () => {
    expect(() => resolveStoredPath("../etc/passwd")).toThrow();
    expect(() => resolveStoredPath("a/../../b")).toThrow();
  });

  it("writeUpload writes stream and returns paths and size", async () => {
    const buf = Buffer.from("hello");
    const source = Readable.from([buf]);
    const { storedPath, relativePath, size } = await writeUpload(source, {
      ext: ".txt",
      maxBytes: 10_000,
    });
    expect(size).toBe(5);
    expect(storedPath).toBe(relativePath);
    expect(storedPath).toMatch(/^\d{4}\/\d{2}\/[\da-f-]+\.txt$/i);
    const abs = resolveStoredPath(storedPath);
    expect(await readFile(abs, "utf8")).toBe("hello");
  });

  it("writeUpload rejects streams over maxBytes", async () => {
    const buf = Buffer.alloc(100, 0x41);
    const source = Readable.from(buf);
    await expect(
      writeUpload(source, { ext: ".bin", maxBytes: 50 }),
    ).rejects.toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  });

  it("mimeToKind classifies types", () => {
    expect(mimeToKind("image/png")).toBe("image");
    expect(mimeToKind("image/svg+xml")).toBe("file");
    expect(mimeToKind("application/pdf")).toBe("file");
  });

  it("sanitizeExtension extracts a safe suffix", () => {
    expect(sanitizeExtension("photo.JPG")).toBe(".JPG");
    expect(sanitizeExtension("noext")).toBe("");
    expect(sanitizeExtension(".hidden")).toBe("");
  });
});
