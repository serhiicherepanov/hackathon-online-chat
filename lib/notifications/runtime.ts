"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveConversationStore } from "@/lib/stores/active-conversation-store";

/**
 * Mount-once hook that:
 *  1. reports focus state to the server every 10s (plus on visibility / focus
 *     changes) so background push dispatch can be suppressed while the user
 *     is actively viewing the target conversation;
 *  2. listens for `postMessage({ type: "navigate", url })` from the service
 *     worker's `notificationclick` handler and performs an in-app router
 *     navigation.
 */
export function useNotificationsRuntime(enabled: boolean): void {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    let cancelled = false;
    const heartbeat = async () => {
      if (cancelled) return;
      const visible = document.visibilityState === "visible";
      const focused = document.hasFocus();
      const conv = useActiveConversationStore.getState().conversationId;
      const conversationId = visible && focused ? conv : null;
      try {
        await fetch("/api/notifications/focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({ conversationId }),
        });
      } catch {
        // best effort
      }
    };

    void heartbeat();
    const interval = window.setInterval(heartbeat, 10_000);
    const onVisibility = () => void heartbeat();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onVisibility);
    window.addEventListener("blur", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onVisibility);
      window.removeEventListener("blur", onVisibility);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (!data || data.type !== "navigate" || !data.url) return;
      try {
        const url = new URL(data.url, window.location.origin);
        if (url.origin !== window.location.origin) return;
        router.push(url.pathname + url.search);
      } catch {
        // ignore malformed URLs
      }
    };

    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, [enabled, router]);
}
