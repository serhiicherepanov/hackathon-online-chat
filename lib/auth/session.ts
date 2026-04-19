import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import type { IronSession } from "iron-session";
import type { Session, User } from "@prisma/client";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOptions } from "./session-options";

export type SessionData = {
  token?: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getIronSessionCookie(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

async function getStoredSessionToken(): Promise<string | null> {
  const session = await getIronSessionCookie();
  return session.token ?? null;
}

export async function getCurrentSessionTokenHash(): Promise<string | null> {
  const token = await getStoredSessionToken();
  return token ? hashToken(token) : null;
}

export async function createBrowserSession(input: {
  userId: string;
  userAgent?: string | null;
  ip?: string | null;
}): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  await prisma.session.create({
    data: {
      userId: input.userId,
      tokenHash,
      userAgent: input.userAgent ?? undefined,
      ip: input.ip ?? undefined,
    },
  });
  const session = await getIronSessionCookie();
  session.token = token;
  await session.save();
}

export async function resolveBrowserSessionRecord(): Promise<
  (Session & { user: User }) | null
> {
  const tokenHash = await getCurrentSessionTokenHash();
  if (!tokenHash) return null;

  return prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
}

export async function getCurrentSessionId(): Promise<string | null> {
  const row = await resolveBrowserSessionRecord();
  return row?.id ?? null;
}

export async function resolveSessionUser(): Promise<User | null> {
  const row = await resolveBrowserSessionRecord();
  return row?.user ?? null;
}

export async function touchSessionLastSeen(): Promise<void> {
  const tokenHash = await getCurrentSessionTokenHash();
  if (!tokenHash) return;
  await prisma.session.updateMany({
    where: { tokenHash },
    data: { lastSeenAt: new Date() },
  });
}

export async function destroyBrowserSession(): Promise<void> {
  const session = await getIronSessionCookie();
  const token = session.token;
  if (token) {
    const tokenHash = hashToken(token);
    await prisma.session.deleteMany({ where: { tokenHash } });
  }
  session.destroy();
}

export async function requireSessionUser(): Promise<
  | { ok: true; user: User }
  | { ok: false; response: NextResponse }
> {
  const user = await resolveSessionUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export function hashOpaqueToken(token: string): string {
  return hashToken(token);
}
