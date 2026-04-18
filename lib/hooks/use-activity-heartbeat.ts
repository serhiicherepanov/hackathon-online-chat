"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 30_000;
const ACTIVITY_WINDOW_MS = 2000;

/**
 * Sends an activity heartbeat to the server while the user is actively
 * interacting with this tab. Activity is defined as mouse move / keypress /
 * touch / scroll within the last 2s. If no activity, no heartbeat — the
 * server then falls back to AFK / offline via the absence signal.
 */
export function useActivityHeartbeat(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let lastActivityAt = Date.now();

    const bump = () => {
      lastActivityAt = Date.now();
    };

    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "touchstart",
      "scroll",
      "focus",
    ];
    for (const e of events) window.addEventListener(e, bump, { passive: true });

    const send = () => {
      if (Date.now() - lastActivityAt > ACTIVITY_WINDOW_MS) return;
      if (document.hidden) return;
      void fetch("/api/presence/heartbeat", { method: "POST" }).catch(
        () => undefined,
      );
    };

    send();
    const id = window.setInterval(send, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
      for (const e of events) window.removeEventListener(e, bump);
    };
  }, [enabled]);
}
