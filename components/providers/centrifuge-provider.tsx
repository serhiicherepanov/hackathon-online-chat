"use client";

import type { Centrifuge, Subscription } from "centrifuge";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createCentrifuge } from "@/lib/centrifuge";
import { useActiveConversationStore } from "@/lib/stores/active-conversation-store";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { usePresenceStore } from "@/lib/stores/presence-store";
import { useTypingStore } from "@/lib/stores/typing-store";
import { useUnreadStore } from "@/lib/stores/unread-store";
import type {
  PresenceChangedPayload,
  SocialEventPayload,
  UnreadChangedPayload,
} from "@/lib/realtime/payloads";

type CentrifugeContextValue = {
  client: Centrifuge | null;
  status: "disconnected" | "connecting" | "connected";
};

const CentrifugeContext = createContext<CentrifugeContextValue>({
  client: null,
  status: "disconnected",
});

export function useCentrifugeContext(): CentrifugeContextValue {
  return useContext(CentrifugeContext);
}

function handleSocialEvent(
  data: SocialEventPayload,
  queryClient: ReturnType<typeof useQueryClient>,
) {
  void queryClient.invalidateQueries({ queryKey: ["me", "friends"] });
  if (data.type === "dm.frozen" || data.type === "block.created" || data.type === "block.removed") {
    void queryClient.invalidateQueries({ queryKey: ["me", "dm-contacts"] });
  }
}

function derivePresenceStatus(data: PresenceChangedPayload): "online" | "afk" | "offline" {
  if (data.status) return data.status;
  return data.online === false ? "offline" : "online";
}

export function CentrifugeProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [client, setClient] = useState<Centrifuge | null>(null);
  const [status, setStatus] =
    useState<CentrifugeContextValue["status"]>("disconnected");
  const setConnectionState = useConnectionStore((s) => s.setState);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_CENTRIFUGO_WS_URL;
    if (!wsUrl || !userId) {
      setClient(null);
      setStatus("disconnected");
      setConnectionState("disconnected");
      return;
    }

    const instance = createCentrifuge({ wsUrl });
    setClient(instance);
    setConnectionState("connecting");
    setStatus("connecting");

    instance.on("connecting", () => {
      setStatus("connecting");
      setConnectionState("connecting");
    });
    instance.on("connected", () => {
      setStatus("connected");
      setConnectionState("connected");
      void fetch("/api/presence/reconcile", { method: "POST" }).catch(() => undefined);
    });
    instance.on("disconnected", () => {
      setStatus("disconnected");
      setConnectionState("disconnected");
      void fetch("/api/presence/reconcile", {
        method: "POST",
        keepalive: true,
      }).catch(() => undefined);
    });

    let userSub: Subscription | null = null;
    let presenceSub: Subscription | null = null;

    try {
      userSub = instance.newSubscription(`user:${userId}`);
      userSub.on("publication", (ctx) => {
        const data = ctx.data as
          | UnreadChangedPayload
          | PresenceChangedPayload
          | SocialEventPayload;
        if (!data || typeof data !== "object") return;

        if (data.type === "unread.changed") {
          void queryClient.invalidateQueries({ queryKey: ["me", "dm-contacts"] });

          const active = useActiveConversationStore.getState().conversationId;
          if (data.conversationId === active) {
            void fetch(`/api/conversations/${active}/read`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({}),
            }).catch(() => undefined);
            useUnreadStore.getState().clear(active);
            return;
          }

          if (typeof data.unread === "number") {
            useUnreadStore.getState().setCount(data.conversationId, data.unread);
          } else if (typeof data.unreadDelta === "number") {
            useUnreadStore.getState().mergeDelta(data.conversationId, data.unreadDelta);
          }
          return;
        }

        if (data.type === "presence.changed") {
          usePresenceStore
            .getState()
            .setStatus(data.userId, derivePresenceStatus(data));
          return;
        }

        if (
          data.type === "friend.request" ||
          data.type === "friend.accepted" ||
          data.type === "friend.removed" ||
          data.type === "block.created" ||
          data.type === "block.removed" ||
          data.type === "dm.frozen"
        ) {
          handleSocialEvent(data, queryClient);
          return;
        }
      });
      userSub.subscribe();

      presenceSub = instance.newSubscription("presence");
      presenceSub.on("publication", (ctx) => {
        const data = ctx.data as PresenceChangedPayload;
        if (data?.type !== "presence.changed") return;
        usePresenceStore
          .getState()
          .setStatus(data.userId, derivePresenceStatus(data));
      });
      presenceSub.subscribe();
    } catch {
      // subscription failures are surfaced via connection state; shell has a boundary
    }

    instance.connect();

    // Expire typing indicators regardless of new events.
    const pruneHandle = window.setInterval(() => {
      useTypingStore.getState().prune();
    }, 1000);

    return () => {
      window.clearInterval(pruneHandle);
      try {
        void userSub?.unsubscribe();
        void presenceSub?.unsubscribe();
      } catch {
        // ignore
      }
      instance.disconnect();
      setClient(null);
      setStatus("disconnected");
      setConnectionState("disconnected");
    };
  }, [queryClient, setConnectionState, userId]);

  const value = useMemo(() => ({ client, status }), [client, status]);

  return (
    <CentrifugeContext.Provider value={value}>
      {children}
    </CentrifugeContext.Provider>
  );
}
