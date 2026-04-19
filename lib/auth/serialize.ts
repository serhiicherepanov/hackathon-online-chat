import type { Session, User } from "@prisma/client";

export type AuthUserDto = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

export type SessionSummaryDto = {
  id: string;
  current: boolean;
  createdAt: string;
  lastSeenAt: string;
  userAgent: string | null;
  ip: string | null;
  browserLabel: string;
};

export function getUserDisplayName(
  user: Pick<User, "displayName" | "username">,
): string {
  const displayName = user.displayName?.trim();
  return displayName && displayName.length > 0 ? displayName : user.username;
}

export function serializeAuthUser(
  user: Pick<
    User,
    "id" | "email" | "username" | "displayName" | "avatarUrl" | "createdAt"
  >,
): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

function detectBrowser(userAgent: string): string | null {
  if (/Edg\//.test(userAgent)) return "Edge";
  if (/OPR\//.test(userAgent)) return "Opera";
  if (/Chrome\//.test(userAgent)) return "Chrome";
  if (/Firefox\//.test(userAgent)) return "Firefox";
  if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return "Safari";
  return null;
}

function detectPlatform(userAgent: string): string | null {
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Android/i.test(userAgent)) return "Android";
  if (/(iPhone|iPad|iPod)/i.test(userAgent)) return "iOS";
  if (/Mac OS X/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return null;
}

export function summarizeUserAgent(userAgent: string | null | undefined): string {
  if (!userAgent) {
    return "Unknown browser";
  }

  const browser = detectBrowser(userAgent);
  const platform = detectPlatform(userAgent);

  if (browser && platform) {
    return `${browser} on ${platform}`;
  }

  return browser ?? platform ?? "Unknown browser";
}

export function serializeSessionSummary(
  session: Pick<Session, "id" | "createdAt" | "lastSeenAt" | "userAgent" | "ip">,
  currentSessionId: string | null,
): SessionSummaryDto {
  return {
    id: session.id,
    current: session.id === currentSessionId,
    createdAt: session.createdAt.toISOString(),
    lastSeenAt: session.lastSeenAt.toISOString(),
    userAgent: session.userAgent ?? null,
    ip: session.ip ?? null,
    browserLabel: summarizeUserAgent(session.userAgent),
  };
}
