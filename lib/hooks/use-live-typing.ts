"use client";

import type { Centrifuge, Subscription } from "centrifuge";
import { useEffect } from "react";
import type { TypingPayload } from "@/lib/realtime/payloads";
import { useTypingStore } from "@/lib/stores/typing-store";

/**
 * Subscribes to live typing events for a conversation channel and feeds the
 * typing store, excluding the current user's own publications.
 */
export function useLiveTyping(
  client: Centrifuge | null,
  conversationId: string | undefined,
  channel: string | undefined,
  selfUserId: string | null,
): void {
  const upsert = useTypingStore((s) => s.upsert);

  useEffect(() => {
    if (!client || !conversationId || !channel) return;
    let sub: Subscription;

    const existing = client.getSubscription(channel);
    if (existing) {
      sub = existing;
    } else {
      try {
        sub = client.newSubscription(channel);
      } catch {
        const again = client.getSubscription(channel);
        if (!again) return;
        sub = again;
      }
    }

    const handler = (ctx: { data: unknown }) => {
      const data = ctx.data as TypingPayload | { type?: string };
      if (!data || (data as TypingPayload).type !== "typing") return;
      const typed = data as TypingPayload;
      if (typed.conversationId !== conversationId) return;
      if (selfUserId && typed.userId === selfUserId) return;
      upsert(
        conversationId,
        { userId: typed.userId, username: typed.username },
      );
    };

    sub.on("publication", handler);
    if (sub.state !== "subscribed" && sub.state !== "subscribing") {
      sub.subscribe();
    }

    return () => {
      sub.off("publication", handler);
    };
  }, [channel, client, conversationId, selfUserId, upsert]);
}
