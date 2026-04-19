import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPasswordResetUrl,
  deleteExpiredPasswordResetTokens,
  findValidPasswordResetToken,
  issuePasswordResetToken,
  markPasswordResetTokenUsed,
  writePasswordResetDeliveryArtifact,
} from "./password-reset";

describe("password reset helpers", () => {
  const originalBaseUrl = process.env.PASSWORD_RESET_BASE_URL;

  afterEach(() => {
    process.env.PASSWORD_RESET_BASE_URL = originalBaseUrl;
    delete process.env.PASSWORD_RESET_DELIVERY_FILE;
  });

  it("builds reset URLs from the request origin by default", () => {
    delete process.env.PASSWORD_RESET_BASE_URL;

    expect(
      buildPasswordResetUrl({
        token: "token-123",
        requestUrl: "http://localhost:3080/api/auth/password/reset",
      }),
    ).toBe("http://localhost:3080/reset-password?token=token-123");
  });

  it("allows overriding the reset URL base", () => {
    process.env.PASSWORD_RESET_BASE_URL = "https://chat.example.com";

    expect(
      buildPasswordResetUrl({
        token: "token-123",
        requestUrl: "http://localhost:3080/api/auth/password/reset",
      }),
    ).toBe("https://chat.example.com/reset-password?token=token-123");
  });

  it("issues hashed tokens instead of persisting raw secrets", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const db = {
      passwordResetToken: {
        create,
        findFirst: vi.fn(),
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    const issued = await issuePasswordResetToken("user-1", db);

    expect(issued.token).toHaveLength(43);
    expect(issued.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        userId: "user-1",
      },
    });
    expect(create.mock.calls[0]?.[0]?.data?.tokenHash).not.toBe(issued.token);
  });

  it("treats one updated row as a successful consume", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const db = {
      passwordResetToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany,
        deleteMany: vi.fn(),
      },
    };

    await expect(markPasswordResetTokenUsed("reset-1", db)).resolves.toBe(true);
  });

  it("treats zero updated rows as an expired or reused token", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const db = {
      passwordResetToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany,
        deleteMany: vi.fn(),
      },
    };

    await expect(markPasswordResetTokenUsed("reset-1", db)).resolves.toBe(false);
  });

  it("looks up only unexpired unused tokens by hashed secret", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "reset-1" });
    const db = {
      passwordResetToken: {
        create: vi.fn(),
        findFirst,
        updateMany: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    await expect(findValidPasswordResetToken("plain-token", db)).resolves.toEqual({
      id: "reset-1",
    });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.any(String),
        usedAt: null,
        expiresAt: { gt: expect.any(Date) },
      },
    });
    expect(findFirst.mock.calls[0]?.[0]?.where?.tokenHash).not.toBe("plain-token");
  });

  it("deletes expired and already-consumed reset tokens", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 3 });
    const db = {
      passwordResetToken: {
        create: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn(),
        deleteMany,
      },
    };

    await expect(deleteExpiredPasswordResetTokens(db)).resolves.toEqual({ count: 3 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [{ usedAt: { not: null } }, { expiresAt: { lte: expect.any(Date) } }],
      },
    });
  });

  it("writes a dev/test delivery artifact when configured", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "password-reset-"));
    const filePath = path.join(dir, "deliveries.log");
    process.env.PASSWORD_RESET_DELIVERY_FILE = filePath;

    await writePasswordResetDeliveryArtifact({
      email: "alice@example.com",
      userId: "user-1",
      resetUrl: "http://localhost:3080/reset-password?token=abc",
      expiresAt: new Date("2026-04-19T13:00:00.000Z"),
    });

    const contents = await readFile(filePath, "utf8");
    expect(contents).toContain("\"email\":\"alice@example.com\"");
    expect(contents).toContain("\"resetUrl\":\"http://localhost:3080/reset-password?token=abc\"");
  });
});
