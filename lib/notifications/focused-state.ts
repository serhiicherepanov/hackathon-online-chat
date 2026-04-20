/**
 * In-memory map of which conversation each signed-in user currently has
 * focused (tab visible + OS focus + conversation open). Populated by the
 * `POST /api/notifications/focus` heartbeat from the client every 10s and
 * consumed by `sendPushToUser` to decide whether to suppress a push.
 *
 * Lives in-process because Next.js on the hackathon stack is a single node.
 * If R5 horizontally scales app pods this needs to move to Redis (or a
 * Centrifugo presence side-channel).
 */

type Entry = {
  conversationId: string | null;
  expiresAt: number;
};

const TTL_MS = 30_000;

const focused = new Map<string, Entry>();

export function setFocused(userId: string, conversationId: string | null): void {
  focused.set(userId, {
    conversationId,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function getFocusedConversationId(userId: string): string | null {
  const entry = focused.get(userId);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    focused.delete(userId);
    return null;
  }
  return entry.conversationId;
}

export function clearFocused(userId: string): void {
  focused.delete(userId);
}

export function __resetFocusedForTests(): void {
  focused.clear();
}
