"use client";

import { useEffect } from "react";
import {
  ACTIVITY_THROTTLE_MS,
  HEARTBEAT_INTERVAL_MS,
  shouldBeat,
} from "@/lib/presence/activity";

const IMMEDIATE_HEARTBEAT_DEDUPE_MS = 500;

/**
 * Sends an activity heartbeat to the server while the user is actively
 * interacting with this tab. Capture-phase listeners ensure activity still
 * counts inside overlays/popovers that stop propagation before bubble.
 */
export function useActivityHeartbeat(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let lastActivityAt = Date.now();
    let lastBumpAt = 0;
    let immediateBeatInFlight = false;
    let immediateBeatLockedUntil = 0;

    const listenerOptions = { capture: true, passive: true } as const;
    const activityEvents = [
      "pointerdown",
      "pointermove",
      "mousemove",
      "keydown",
      "wheel",
      "scroll",
      "touchstart",
      "focus",
    ] as const;

    const recordActivity = (now = Date.now()) => {
      if (now - lastBumpAt < ACTIVITY_THROTTLE_MS) {
        return;
      }

      lastBumpAt = now;
      lastActivityAt = now;
    };

    const postHeartbeat = (keepalive = false) =>
      fetch("/api/presence/heartbeat", { method: "POST", keepalive }).catch(
        () => undefined,
      );

    const sendScheduledHeartbeat = () => {
      if (!shouldBeat({ now: Date.now(), lastActivityAt })) {
        return;
      }

      void postHeartbeat();
    };

    const sendImmediateHeartbeat = (keepalive = false) => {
      const now = Date.now();
      if (immediateBeatInFlight || now < immediateBeatLockedUntil) {
        return;
      }

      immediateBeatInFlight = true;
      immediateBeatLockedUntil = now + IMMEDIATE_HEARTBEAT_DEDUPE_MS;
      void postHeartbeat(keepalive).finally(() => {
        immediateBeatInFlight = false;
      });
    };

    const onActivity = () => {
      recordActivity();
    };

    const onFocus = () => {
      const now = Date.now();
      recordActivity(now);
      sendImmediateHeartbeat();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const now = Date.now();
      recordActivity(now);
      sendImmediateHeartbeat(true);
    };

    for (const eventName of activityEvents) {
      window.addEventListener(
        eventName,
        eventName === "focus" ? onFocus : onActivity,
        listenerOptions,
      );
      document.addEventListener(eventName, onActivity, listenerOptions);
    }
    document.addEventListener(
      "visibilitychange",
      onVisibilityChange,
      listenerOptions,
    );

    sendScheduledHeartbeat();
    const id = window.setInterval(sendScheduledHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.clearInterval(id);
      for (const eventName of activityEvents) {
        window.removeEventListener(
          eventName,
          eventName === "focus" ? onFocus : onActivity,
          listenerOptions,
        );
        document.removeEventListener(eventName, onActivity, listenerOptions);
      }
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
        listenerOptions,
      );
    };
  }, [enabled]);
}
