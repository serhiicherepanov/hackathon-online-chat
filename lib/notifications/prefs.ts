"use client";

import { get, set } from "idb-keyval";
import { useEffect, useState } from "react";

export type Category = "dm" | "mention" | "room" | "friend-request";
export type SoundLevel = "off" | "soft" | "normal" | "loud";

export type NotificationPrefs = {
  dm: boolean;
  mention: boolean;
  friendRequest: boolean;
  rooms: Record<string, boolean>;
  muteUntil: number | null; // epoch ms, or null for no mute
  sound: Record<Category, SoundLevel>;
};

const KEY = "online-chat.notification-prefs.v1";

export const DEFAULT_PREFS: NotificationPrefs = {
  dm: true,
  mention: true,
  friendRequest: true,
  rooms: {},
  muteUntil: null,
  sound: {
    dm: "normal",
    mention: "normal",
    room: "off",
    "friend-request": "normal",
  },
};

type Listener = (prefs: NotificationPrefs) => void;

let cached: NotificationPrefs | null = null;
let loading: Promise<NotificationPrefs> | null = null;
const listeners = new Set<Listener>();

async function load(): Promise<NotificationPrefs> {
  if (cached) return cached;
  if (typeof indexedDB === "undefined") {
    cached = { ...DEFAULT_PREFS };
    return cached;
  }
  if (!loading) {
    loading = (async () => {
      const raw = (await get<Partial<NotificationPrefs>>(KEY).catch(() => undefined)) ?? undefined;
      const merged: NotificationPrefs = {
        ...DEFAULT_PREFS,
        ...(raw ?? {}),
        rooms: { ...DEFAULT_PREFS.rooms, ...(raw?.rooms ?? {}) },
        sound: { ...DEFAULT_PREFS.sound, ...(raw?.sound ?? {}) },
      };
      cached = merged;
      return merged;
    })();
  }
  return loading;
}

async function persist(next: NotificationPrefs): Promise<void> {
  cached = next;
  for (const l of listeners) l(next);
  if (typeof indexedDB !== "undefined") {
    await set(KEY, next).catch(() => undefined);
  }
}

export async function getPrefs(): Promise<NotificationPrefs> {
  return load();
}

export async function updatePrefs(
  patch: Partial<NotificationPrefs> | ((p: NotificationPrefs) => NotificationPrefs),
): Promise<NotificationPrefs> {
  const current = await load();
  const next =
    typeof patch === "function"
      ? patch(current)
      : { ...current, ...patch };
  await persist(next);
  await mirrorToServer(next).catch(() => undefined);
  return next;
}

/** Compute mute-until epoch from a menu selection relative to `now`. */
export function computeMuteUntil(
  choice: "1h" | "8h" | "tomorrow8am" | "indefinite" | "resume",
  now: Date = new Date(),
): number | null {
  if (choice === "resume") return null;
  if (choice === "indefinite") return Number.MAX_SAFE_INTEGER;
  if (choice === "1h") return now.getTime() + 60 * 60 * 1000;
  if (choice === "8h") return now.getTime() + 8 * 60 * 60 * 1000;
  // tomorrow 08:00 local
  const t = new Date(now);
  t.setHours(8, 0, 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t.getTime();
}

export function isMuted(prefs: NotificationPrefs, now = Date.now()): boolean {
  return prefs.muteUntil !== null && prefs.muteUntil > now;
}

export function categoryEnabled(prefs: NotificationPrefs, category: Category, conversationId?: string): boolean {
  switch (category) {
    case "dm":
      return prefs.dm;
    case "mention":
      return prefs.mention;
    case "friend-request":
      return prefs.friendRequest;
    case "room":
      if (!conversationId) return false;
      return prefs.rooms[conversationId] === true;
  }
}

export function useNotificationPrefs(): {
  prefs: NotificationPrefs;
  loading: boolean;
  update: typeof updatePrefs;
} {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(cached);

  useEffect(() => {
    let active = true;
    const onChange: Listener = (p) => {
      if (active) setPrefs(p);
    };
    listeners.add(onChange);
    void load().then((p) => {
      if (active) setPrefs(p);
    });
    return () => {
      active = false;
      listeners.delete(onChange);
    };
  }, []);

  return {
    prefs: prefs ?? DEFAULT_PREFS,
    loading: prefs === null,
    update: updatePrefs,
  };
}

/**
 * Mirror push-relevant preferences to the server so background Web Push
 * respects the same category/mute state. Best-effort; foreground dispatch
 * still works if this fails.
 */
async function mirrorToServer(prefs: NotificationPrefs): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/subscribe", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        mirroredPrefs: {
          dm: prefs.dm,
          mention: prefs.mention,
          friendRequest: prefs.friendRequest,
          rooms: prefs.rooms,
          muteUntil: prefs.muteUntil,
        },
      }),
    });
  } catch {
    // best-effort
  }
}

export function __resetPrefsForTests(): void {
  cached = null;
  loading = null;
  listeners.clear();
}
