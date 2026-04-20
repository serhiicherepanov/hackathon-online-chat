import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS, type NotificationPrefs } from "./prefs";
import { maybeShow } from "./foreground";

function makePrefs(over: Partial<NotificationPrefs> = {}): NotificationPrefs {
  return { ...DEFAULT_PREFS, ...over };
}

describe("foreground.maybeShow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("skipped when tab focused on target DM", () => {
    const res = maybeShow(
      {
        category: "dm",
        conversationId: "c1",
        title: "Alice",
        body: "hi",
        url: "/dm/c1",
      },
      {
        prefs: makePrefs(),
        activeConversationId: "c1",
        isDocumentVisible: () => true,
        hasDocumentFocus: () => true,
        notify: vi.fn(),
        playCategory: vi.fn(),
      },
    );
    expect(res.shown).toBe(false);
    expect(res.reason).toBe("focused-on-target");
  });

  it("shows and plays when tab unfocused", () => {
    const notify = vi.fn();
    const playCategory = vi.fn();
    const res = maybeShow(
      {
        category: "dm",
        conversationId: "c1",
        title: "Alice",
        body: "hi",
        url: "/dm/c1",
      },
      {
        prefs: makePrefs(),
        activeConversationId: null,
        isDocumentVisible: () => false,
        hasDocumentFocus: () => false,
        notify,
        playCategory,
      },
    );
    // Notification API is unavailable in jsdom → shown=false, but played=true.
    expect(res.played).toBe(true);
    expect(playCategory).toHaveBeenCalledWith("dm", expect.any(Object));
  });

  it("suppressed during mute window (no sound, no show)", () => {
    const notify = vi.fn();
    const playCategory = vi.fn();
    const res = maybeShow(
      {
        category: "dm",
        conversationId: "c1",
        title: "Alice",
        body: "hi",
        url: "/dm/c1",
      },
      {
        prefs: makePrefs({ muteUntil: Date.now() + 60_000 }),
        activeConversationId: null,
        isDocumentVisible: () => false,
        hasDocumentFocus: () => false,
        notify,
        playCategory,
      },
    );
    expect(res.shown).toBe(false);
    expect(res.played).toBe(false);
    expect(res.reason).toBe("muted");
    expect(playCategory).not.toHaveBeenCalled();
  });

  it("suppressed when category off", () => {
    const playCategory = vi.fn();
    const res = maybeShow(
      {
        category: "dm",
        conversationId: "c1",
        title: "Alice",
        body: "hi",
        url: "/dm/c1",
      },
      {
        prefs: makePrefs({ dm: false }),
        activeConversationId: null,
        isDocumentVisible: () => false,
        hasDocumentFocus: () => false,
        notify: vi.fn(),
        playCategory,
      },
    );
    expect(res.reason).toBe("category-off");
    expect(playCategory).not.toHaveBeenCalled();
  });

  it("does not call sound when sound level is off even if category is enabled", () => {
    const playCategory = vi.fn();
    const res = maybeShow(
      {
        category: "dm",
        conversationId: "c1",
        title: "Alice",
        body: "hi",
        url: "/dm/c1",
      },
      {
        prefs: makePrefs({ sound: { ...DEFAULT_PREFS.sound, dm: "off" } }),
        activeConversationId: null,
        isDocumentVisible: () => false,
        hasDocumentFocus: () => false,
        notify: vi.fn(),
        playCategory,
      },
    );
    expect(res.played).toBe(false);
    expect(playCategory).not.toHaveBeenCalled();
  });
});
