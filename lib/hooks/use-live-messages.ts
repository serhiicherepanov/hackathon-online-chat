import { useQueryClient } from "@tanstack/react-query";
import type { Centrifuge, Subscription } from "centrifuge";
import { useEffect } from "react";
import type { MessageDto } from "@/lib/types/chat";
import type { MessageCreatedPayload } from "@/lib/realtime/payloads";

export function useLiveMessages(
  client: Centrifuge | null,
  conversationId: string | undefined,
  channel: string | undefined,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!client || !conversationId || !channel) return;

    let sub: Subscription;

    try {
      sub = client.newSubscription(channel);
    } catch {
      return;
    }

    sub.on("publication", (ctx) => {
      const data = ctx.data as MessageCreatedPayload;
      if (data?.type !== "message.created") return;
      if (data.conversationId !== conversationId) return;

      const incoming = data.message;
      queryClient.setQueryData(
        ["conv", conversationId, "messages"],
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const o = old as {
            pages: { messages: MessageDto[]; nextCursor: string | null }[];
            pageParams: unknown[];
          };
          if (!o.pages?.length) return old;
          const first = o.pages[0];
          if (first.messages.some((m) => m.id === incoming.id)) return old;
          const normalized: MessageDto = {
            ...incoming,
            createdAt:
              typeof incoming.createdAt === "string"
                ? incoming.createdAt
                : String(incoming.createdAt),
          };
          return {
            ...o,
            pages: [
              { ...first, messages: [normalized, ...first.messages] },
              ...o.pages.slice(1),
            ],
          };
        },
      );
    });

    sub.subscribe();

    return () => {
      void sub.unsubscribe();
    };
  }, [channel, client, conversationId, queryClient]);
}
