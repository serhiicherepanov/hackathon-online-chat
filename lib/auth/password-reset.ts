import { randomBytes } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { hashOpaqueToken } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

type PasswordResetStore = {
  passwordResetToken: {
    create: typeof prisma.passwordResetToken.create;
    findFirst: typeof prisma.passwordResetToken.findFirst;
    updateMany: typeof prisma.passwordResetToken.updateMany;
    deleteMany: typeof prisma.passwordResetToken.deleteMany;
  };
};

function getPasswordResetStore(db?: PasswordResetStore) {
  return db ?? prisma;
}

export function buildPasswordResetUrl(input: {
  token: string;
  requestUrl: string;
}): string {
  const base =
    process.env.PASSWORD_RESET_BASE_URL?.trim() ||
    new URL(input.requestUrl).origin;
  return new URL(`/reset-password?token=${input.token}`, base).toString();
}

export async function issuePasswordResetToken(
  userId: string,
  db?: PasswordResetStore,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  await getPasswordResetStore(db).passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashOpaqueToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function findValidPasswordResetToken(
  token: string,
  db?: PasswordResetStore,
) {
  return getPasswordResetStore(db).passwordResetToken.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token),
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function markPasswordResetTokenUsed(
  tokenId: string,
  db?: PasswordResetStore,
): Promise<boolean> {
  const result = await getPasswordResetStore(db).passwordResetToken.updateMany({
    where: {
      id: tokenId,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      usedAt: new Date(),
    },
  });

  return result.count === 1;
}

export async function deleteExpiredPasswordResetTokens(db?: PasswordResetStore) {
  return getPasswordResetStore(db).passwordResetToken.deleteMany({
    where: {
      OR: [{ usedAt: { not: null } }, { expiresAt: { lte: new Date() } }],
    },
  });
}

export function logPasswordResetDelivery(input: {
  email: string;
  userId: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  logger.info(
    {
      email: input.email,
      userId: input.userId,
      resetUrl: input.resetUrl,
      expiresAt: input.expiresAt.toISOString(),
    },
    "password reset requested",
  );
}

export async function writePasswordResetDeliveryArtifact(input: {
  email: string;
  userId: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  const filePath = process.env.PASSWORD_RESET_DELIVERY_FILE?.trim();
  if (!filePath) return;

  await mkdir(path.dirname(filePath), { recursive: true });
  await appendFile(
    filePath,
    `${JSON.stringify({
      email: input.email,
      userId: input.userId,
      resetUrl: input.resetUrl,
      expiresAt: input.expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    })}\n`,
    "utf8",
  );
}
