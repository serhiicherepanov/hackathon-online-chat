"use client";

import {
  categoryEnabled,
  isMuted,
  type Category,
  type NotificationPrefs,
} from "./prefs";
import { play as playSound } from "./sound";

export type ForegroundEvent = {
  category: Category;
  /**
   * Conversation this event originates from. For DMs and room messages this
   * is the conversationId; for friend requests it may be null.
   */
  conversationId: string | null;
  title: string;
  body: string;
  /** URL the notification should navigate to on click. */
  url: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export type MaybeShowContext = {
  prefs: NotificationPrefs;
  /** The conversationId the user currently has open in the app, if any. */
  activeConversationId: string | null;
  /** Overridable for tests. */
  now?: number;
  /** Overridable for tests. */
  isDocumentVisible?: () => boolean;
  /** Overridable for tests. */
  hasDocumentFocus?: () => boolean;
  /** Overridable for tests. */
  notify?: (title: string, options: NotificationOptions) => void;
  /** Overridable for tests. */
  playCategory?: (category: Category, event: ForegroundEvent) => void;
};

export function maybeShow(
  event: ForegroundEvent,
  ctx: MaybeShowContext,
): { shown: boolean; played: boolean; reason?: string } {
  const { prefs, activeConversationId } = ctx;
  if (isMuted(prefs, ctx.now)) return { shown: false, played: false, reason: "muted" };

  if (!categoryEnabled(prefs, event.category, event.conversationId ?? undefined)) {
    return { shown: false, played: false, reason: "category-off" };
  }

  const visible =
    (ctx.isDocumentVisible ?? (() => typeof document !== "undefined" && document.visibilityState === "visible"))();
  const focused =
    (ctx.hasDocumentFocus ?? (() => typeof document !== "undefined" && document.hasFocus()))();
  const tabFocused = visible && focused;

  const focusedOnTarget =
    tabFocused &&
    activeConversationId !== null &&
    event.conversationId !== null &&
    activeConversationId === event.conversationId;

  if (focusedOnTarget) {
    return { shown: false, played: false, reason: "focused-on-target" };
  }

  // Show the OS notification (if Notification API is granted).
  let shown = false;
  if (
    typeof window !== "undefined" &&
    typeof Notification !== "undefined" &&
    Notification.permission === "granted"
  ) {
    try {
      const options: NotificationOptions = {
        body: event.body,
        tag: event.tag,
        icon: "/icons/icon-192.png",
        data: { url: event.url, type: event.category, ...(event.data ?? {}) },
      };
      if (ctx.notify) {
        ctx.notify(event.title, options);
      } else {
        new Notification(event.title, options);
      }
      shown = true;
    } catch {
      // swallow — notifications are best-effort
    }
  }

  // Play the per-category sound.
  const soundLevel = prefs.sound[event.category];
  let played = false;
  if (soundLevel !== "off") {
    if (ctx.playCategory) {
      ctx.playCategory(event.category, event);
    } else {
      playSound(event.category, soundLevel);
    }
    played = true;
  }

  return { shown, played };
}
