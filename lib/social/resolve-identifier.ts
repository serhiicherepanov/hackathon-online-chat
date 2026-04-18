import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export type ResolvedUser = { id: string; username: string };

export type ResolveUserResult =
  | { user: ResolvedUser }
  | { error: "user_not_found" };

const CUID_RE = /^c[a-z0-9]{24}$/;

export async function resolveUserByIdentifier(
  prisma: PrismaLike,
  identifier: string,
): Promise<ResolveUserResult> {
  const value = identifier.trim();
  if (!value) return { error: "user_not_found" };

  let user: ResolvedUser | null = null;
  if (CUID_RE.test(value)) {
    user = await prisma.user.findUnique({
      where: { id: value },
      select: { id: true, username: true },
    });
  } else if (value.includes("@")) {
    user = await prisma.user.findUnique({
      where: { email: value.toLowerCase() },
      select: { id: true, username: true },
    });
  } else {
    user = await prisma.user.findUnique({
      where: { username: value },
      select: { id: true, username: true },
    });
  }

  return user ? { user } : { error: "user_not_found" };
}
