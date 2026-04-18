import { centrifugoPresenceClientCount } from "@/lib/centrifugo/server";
import { logger } from "@/lib/logger";
import { consumePresenceTransition } from "@/lib/presence/transitions";
import { publishPresenceChanged } from "@/lib/realtime/emit";

export async function onUserChannelSubscribed(userId: string): Promise<void> {
  try {
    const count = await centrifugoPresenceClientCount(`user:${userId}`);
    if (count >= 1 && consumePresenceTransition(userId, true)) {
      await publishPresenceChanged(userId, true);
    }
  } catch (err) {
    logger.warn({ err, userId }, "onUserChannelSubscribed failed");
  }
}

export async function reconcileUserPresence(userId: string): Promise<void> {
  try {
    await new Promise((r) => setTimeout(r, 300));
    const count = await centrifugoPresenceClientCount(`user:${userId}`);
    const online = count > 0;
    if (consumePresenceTransition(userId, online)) {
      await publishPresenceChanged(userId, online);
    }
  } catch (err) {
    logger.warn({ err, userId }, "reconcileUserPresence failed");
  }
}
