"use client";

import type { Category, SoundLevel } from "./prefs";

const THROTTLES: Record<Category, number> = {
  dm: 1500,
  mention: 500,
  room: 1500,
  "friend-request": 1500,
};

const VOLUMES: Record<SoundLevel, number> = {
  off: 0,
  soft: 0.3,
  normal: 0.7,
  loud: 1.0,
};

const SOURCES: Record<Category, string> = {
  dm: "/sounds/dm.ogg",
  mention: "/sounds/mention.ogg",
  room: "/sounds/room.ogg",
  "friend-request": "/sounds/friend.ogg",
};

type Pool = Record<Category, HTMLAudioElement>;

let pool: Pool | null = null;
let unlocked = false;
let autoplayBlocked = false;
const lastPlayedAt: Record<Category, number> = {
  dm: 0,
  mention: 0,
  room: 0,
  "friend-request": 0,
};

type AutoplayBlockedListener = () => void;
const autoplayBlockedListeners = new Set<AutoplayBlockedListener>();

function getPool(): Pool | null {
  if (typeof window === "undefined") return null;
  if (pool) return pool;
  const categories: Category[] = ["dm", "mention", "room", "friend-request"];
  const built = {} as Pool;
  for (const cat of categories) {
    const el = new Audio(SOURCES[cat]);
    el.preload = "auto";
    el.volume = VOLUMES.normal;
    built[cat] = el;
  }
  pool = built;
  return pool;
}

/** Called inside a user gesture (e.g. the "Enable desktop notifications" click
 *  handler) to satisfy the autoplay policy. Idempotent. */
export function unlock(): void {
  if (unlocked) return;
  const p = getPool();
  if (!p) return;
  for (const el of Object.values(p)) {
    try {
      const prior = el.volume;
      el.volume = 0;
      const result = el.play();
      if (result && typeof result.then === "function") {
        result.catch(() => undefined);
      }
      el.pause();
      el.currentTime = 0;
      el.volume = prior;
    } catch {
      // best-effort
    }
  }
  unlocked = true;
}

export function isUnlocked(): boolean {
  return unlocked;
}

export function onAutoplayBlocked(listener: AutoplayBlockedListener): () => void {
  autoplayBlockedListeners.add(listener);
  return () => {
    autoplayBlockedListeners.delete(listener);
  };
}

export function isAutoplayBlocked(): boolean {
  return autoplayBlocked;
}

function checkAutoplayPolicy(): boolean {
  if (typeof navigator === "undefined") return true;
  const probe = (navigator as { getAutoplayPolicy?: (t: string) => string }).getAutoplayPolicy;
  if (typeof probe !== "function") return true;
  try {
    const policy = probe.call(navigator, "mediaelement");
    if (policy === "disallowed") {
      if (!autoplayBlocked) {
        autoplayBlocked = true;
        for (const l of autoplayBlockedListeners) l();
      }
      return false;
    }
  } catch {
    // treat as allowed
  }
  return true;
}

export function setVolume(category: Category, level: SoundLevel): void {
  const p = getPool();
  if (!p) return;
  p[category].volume = VOLUMES[level];
}

export function play(category: Category, level: SoundLevel = "normal"): void {
  if (level === "off") return;
  if (!checkAutoplayPolicy()) return;
  const p = getPool();
  if (!p) return;
  const now = Date.now();
  if (now - lastPlayedAt[category] < THROTTLES[category]) return;
  lastPlayedAt[category] = now;
  const el = p[category];
  el.volume = VOLUMES[level];
  try {
    el.currentTime = 0;
    const result = el.play();
    if (result && typeof result.then === "function") {
      result.catch(() => {
        // First call may still fail if unlock didn't happen; don't spam errors.
      });
    }
  } catch {
    // ignore
  }
}

export function __resetSoundForTests(): void {
  pool = null;
  unlocked = false;
  autoplayBlocked = false;
  autoplayBlockedListeners.clear();
  for (const k of Object.keys(lastPlayedAt) as Category[]) {
    lastPlayedAt[k] = 0;
  }
}

export const __internals = {
  THROTTLES,
  VOLUMES,
};
