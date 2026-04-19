import { centrifugoPresenceClientCount } from "@/lib/centrifugo/server";
import { logger } from "@/lib/logger";
import {
  computePresenceStatus,
  consumePresenceTransition,
} from "@/lib/presence/transitions";
import { prisma } from "@/lib/prisma";
import { publishPresenceChanged } from "@/lib/realtime/emit";
import type { PresenceStatus } from "@/lib/realtime/payloads";

export async function computeUserPresence(
  userId: string,
): Promise<{ status: PresenceStatus; lastActiveAt: Date | null }> {
  const [count, row] = await Promise.all([
    centrifugoPresenceClientCount(`user:${userId}`),
    prisma.presence.findUnique({
      where: { userId },
      select: { lastActiveAt: true },
    }),
  ]);
  const lastActiveAt = row?.lastActiveAt ?? null;
  const status = computePresenceStatus({
    connectionCount: count,
    lastActiveAt,
  });
  return { status, lastActiveAt };
}

export async function persistPresence(
  userId: string,
  status: PresenceStatus,
  lastActiveAt?: Date,
): Promise<void> {
  try {
    await prisma.presence.upsert({
      where: { userId },
      update: {
        status,
        ...(lastActiveAt ? { lastActiveAt } : {}),
      },
      create: {
        userId,
        status,
        lastActiveAt: lastActiveAt ?? new Date(),
      },
    });
  } catch (err) {
    logger.warn({ err, userId, status }, "persistPresence failed");
  }
}

export async function onUserChannelSubscribed(userId: string): Promise<void> {
  try {
    const { status, lastActiveAt } = await computeUserPresence(userId);
    await persistPresence(userId, status);
    if (consumePresenceTransition(userId, status)) {
      await publishPresenceChanged(userId, status, lastActiveAt ?? undefined);
    }
  } catch (err) {
    logger.warn({ err, userId }, "onUserChannelSubscribed failed");
  }
}

export async function reconcileUserPresence(userId: string): Promise<void> {
  try {
    await new Promise((r) => setTimeout(r, 300));
    const { status, lastActiveAt } = await computeUserPresence(userId);
    await persistPresence(userId, status);
    if (consumePresenceTransition(userId, status)) {
      await publishPresenceChanged(userId, status, lastActiveAt ?? undefined);
    }
  } catch (err) {
    logger.warn({ err, userId }, "reconcileUserPresence failed");
  }
}

export async function recordActivityAndPublish(
  userId: string,
  now = new Date(),
): Promise<{ status: PresenceStatus; lastActiveAt: Date }> {
  await persistPresence(userId, "online", now);
  const count = await centrifugoPresenceClientCount(`user:${userId}`);
  const status = computePresenceStatus({
    connectionCount: count,
    lastActiveAt: now,
  });
  if (consumePresenceTransition(userId, status)) {
    await publishPresenceChanged(userId, status, now);
  }
  return { status, lastActiveAt: now };
}
