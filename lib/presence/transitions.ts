import type { PresenceStatus } from "@/lib/realtime/payloads";

const AFK_WINDOW_MS = 60_000;

const lastStatus = new Map<string, PresenceStatus>();

export function consumePresenceTransition(
  userId: string,
  status: PresenceStatus,
): boolean {
  const prev = lastStatus.get(userId);
  if (prev === status) return false;
  lastStatus.set(userId, status);
  return true;
}

export function peekPresenceStatus(userId: string): PresenceStatus | undefined {
  return lastStatus.get(userId);
}

export type PresenceAggregationInput = {
  connectionCount: number;
  lastActiveAt: Date | null | undefined;
  now?: Date;
  afkWindowMs?: number;
};

export function computePresenceStatus(
  input: PresenceAggregationInput,
): PresenceStatus {
  const window = input.afkWindowMs ?? AFK_WINDOW_MS;
  if (input.connectionCount <= 0) return "offline";
  if (!input.lastActiveAt) return "afk";
  const now = (input.now ?? new Date()).getTime();
  const delta = now - input.lastActiveAt.getTime();
  return delta <= window ? "online" : "afk";
}

export { AFK_WINDOW_MS };
