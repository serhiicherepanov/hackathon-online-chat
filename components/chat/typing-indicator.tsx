"use client";

import { useEffect, useState } from "react";
import { useTypingStore, type TypingEntry } from "@/lib/stores/typing-store";

// Stable fallback reference. Returning `?? []` inline from a zustand selector
// hands React a fresh array identity on every read, which violates the
// `useSyncExternalStore` snapshot-stability contract and triggers an infinite
// re-render loop (React error #185). That would crash every page mounting a
// ConversationView (rooms, DMs) — not just the typing indicator itself.
const EMPTY_ENTRIES: TypingEntry[] = [];

function formatNames(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} more are typing…`;
}

export function TypingIndicator({
  conversationId,
}: {
  conversationId: string;
}) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      useTypingStore.getState().prune();
      setTick((x) => x + 1);
    }, 500);
    return () => window.clearInterval(id);
  }, []);

  const active = useTypingStore(
    (s) => s.byConv[conversationId] ?? EMPTY_ENTRIES,
  );
  const now = Date.now();
  const live = active.filter((e) => e.expiresAt > now);
  if (live.length === 0) {
    return (
      <div
        data-testid="typing-indicator"
        data-active="false"
        className="h-5"
        aria-hidden
      />
    );
  }
  return (
    <div
      data-testid="typing-indicator"
      data-active="true"
      className="h-6 px-5 text-xs text-muted-foreground italic animate-pulse"
      aria-live="polite"
    >
      {formatNames(live.map((e) => e.username))}
    </div>
  );
}
