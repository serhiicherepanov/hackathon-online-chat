import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendWebPush, isWebPushConfigured } from "@/lib/notifications/web-push";

export type PushCategory = "dm" | "mention" | "room" | "friend-request";

export type PushPayload = {
  type: PushCategory;
  title: string;
  body: string;
  url: string;
  tag: string;
  data?: Record<string, unknown>;
};

export type MirroredPrefs = {
  dm?: boolean;
  mention?: boolean;
  friendRequest?: boolean;
  rooms?: Record<string, boolean>;
  muteUntil?: number | null;
};

export type DispatchOptions = {
  /**
   * Room conversation id used to gate room-category pushes against
   * `mirroredPrefs.rooms[<conversationId>]`. Omit for non-room events.
   */
  conversationId?: string;
  /**
   * If true, the caller has verified that the user currently has a connected
   * Centrifugo client focused on the target conversation. In that case we
   * skip push dispatch (the foreground Notification API handles it).
   */
  skipBecauseFocused?: boolean;
};

export type WebPushSender = typeof sendWebPush;

/**
 * Should this subscription receive a push for the given category/conversation
 * based on its mirrored preferences?  Pure function — used by both the live
 * dispatcher and the unit tests.
 */
export function shouldDispatch(
  prefs: MirroredPrefs,
  category: PushCategory,
  opts: DispatchOptions,
  now = Date.now(),
): boolean {
  if (prefs.muteUntil && prefs.muteUntil > now) return false;
  if (opts.skipBecauseFocused) return false;

  switch (category) {
    case "dm":
      return prefs.dm !== false;
    case "mention":
      return prefs.mention !== false;
    case "friend-request":
      return prefs.friendRequest !== false;
    case "room": {
      if (!opts.conversationId) return false;
      const rooms = prefs.rooms ?? {};
      return rooms[opts.conversationId] === true;
    }
  }
}

/**
 * Dispatch a push notification to every registered subscription of `userId`
 * that matches the category under its mirrored prefs, pruning rows whose
 * endpoints return 404/410 from the browser push service.
 *
 * Returns counts useful for tests / observability.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
  opts: DispatchOptions = {},
  injected?: {
    prisma?: PrismaClient;
    send?: WebPushSender;
  },
): Promise<{ sent: number; skipped: number; pruned: number }> {
  if (!isWebPushConfigured()) return { sent: 0, skipped: 0, pruned: 0 };
  const db = injected?.prisma ?? (defaultPrisma as unknown as PrismaClient);
  const send = injected?.send ?? sendWebPush;

  const subs = await db.pushSubscription.findMany({
    where: { userId },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      mirroredPrefs: true,
    },
  });

  let sent = 0;
  let skipped = 0;
  let pruned = 0;

  const prune: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      const prefs = (sub.mirroredPrefs ?? {}) as MirroredPrefs;
      if (!shouldDispatch(prefs, payload.type, opts)) {
        skipped += 1;
        return;
      }
      const res = await send(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload as unknown as Record<string, unknown>,
      );
      if (res.statusCode === 404 || res.statusCode === 410) {
        prune.push(sub.id);
        pruned += 1;
        return;
      }
      if (res.statusCode >= 200 && res.statusCode < 300) {
        sent += 1;
        return;
      }
      skipped += 1;
    }),
  );

  if (prune.length > 0) {
    try {
      await db.pushSubscription.deleteMany({ where: { id: { in: prune } } });
    } catch (err) {
      logger.warn({ err, prune }, "prune push subscriptions failed");
    }
  }

  return { sent, skipped, pruned };
}
