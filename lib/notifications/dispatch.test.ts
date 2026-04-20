import { describe, expect, it, vi } from "vitest";
import {
  shouldDispatch,
  sendPushToUser,
  type MirroredPrefs,
  type PushPayload,
} from "./dispatch";

vi.mock("@/lib/notifications/web-push", async () => ({
  isWebPushConfigured: () => true,
  sendWebPush: vi.fn(),
}));

describe("shouldDispatch", () => {
  const prefs: MirroredPrefs = {
    dm: true,
    mention: true,
    friendRequest: true,
    rooms: { "room-1": true, "room-2": false },
    muteUntil: null,
  };

  it("allows DM when enabled", () => {
    expect(shouldDispatch(prefs, "dm", {})).toBe(true);
  });

  it("skips DM when tab focused on target", () => {
    expect(shouldDispatch(prefs, "dm", { skipBecauseFocused: true })).toBe(false);
  });

  it("skips all categories during mute window", () => {
    const muted: MirroredPrefs = { ...prefs, muteUntil: Date.now() + 60_000 };
    expect(shouldDispatch(muted, "mention", {})).toBe(false);
    expect(shouldDispatch(muted, "dm", {})).toBe(false);
  });

  it("allows after mute window expires", () => {
    const muted: MirroredPrefs = { ...prefs, muteUntil: Date.now() - 1 };
    expect(shouldDispatch(muted, "dm", {})).toBe(true);
  });

  it("gates room category on per-room toggle", () => {
    expect(shouldDispatch(prefs, "room", { conversationId: "room-1" })).toBe(true);
    expect(shouldDispatch(prefs, "room", { conversationId: "room-2" })).toBe(false);
    expect(shouldDispatch(prefs, "room", { conversationId: "room-3" })).toBe(false);
  });

  it("skips when DM category disabled", () => {
    const off: MirroredPrefs = { ...prefs, dm: false };
    expect(shouldDispatch(off, "dm", {})).toBe(false);
  });
});

describe("sendPushToUser", () => {
  const payload: PushPayload = {
    type: "dm",
    title: "Alice",
    body: "hi",
    url: "/dm/c1",
    tag: "dm:c1",
  };

  function makePrisma(rows: Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    mirroredPrefs: MirroredPrefs;
  }>) {
    const deleted: string[][] = [];
    return {
      prisma: {
        pushSubscription: {
          findMany: vi.fn().mockResolvedValue(rows),
          deleteMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => {
            deleted.push(where.id.in);
            return { count: where.id.in.length };
          }),
        },
      } as unknown as NonNullable<Parameters<typeof sendPushToUser>[3]>["prisma"],
      deleted,
    };
  }

  it("sends to enabled subs and prunes 410s", async () => {
    const { prisma, deleted } = makePrisma([
      {
        id: "a",
        endpoint: "https://push/a",
        p256dh: "p",
        auth: "a",
        mirroredPrefs: { dm: true },
      },
      {
        id: "b",
        endpoint: "https://push/b",
        p256dh: "p",
        auth: "a",
        mirroredPrefs: { dm: true },
      },
      {
        id: "c",
        endpoint: "https://push/c",
        p256dh: "p",
        auth: "a",
        mirroredPrefs: { dm: false },
      },
    ]);
    const send = vi
      .fn()
      .mockResolvedValueOnce({ statusCode: 201 })
      .mockResolvedValueOnce({ statusCode: 410 });

    const res = await sendPushToUser("u1", payload, {}, { prisma, send });
    expect(res.sent).toBe(1);
    expect(res.pruned).toBe(1);
    expect(res.skipped).toBe(1);
    expect(deleted.flat()).toEqual(["b"]);
  });

  it("skips all dispatch when skipBecauseFocused is set", async () => {
    const { prisma } = makePrisma([
      {
        id: "a",
        endpoint: "https://push/a",
        p256dh: "p",
        auth: "a",
        mirroredPrefs: { dm: true },
      },
    ]);
    const send = vi.fn();
    const res = await sendPushToUser(
      "u1",
      payload,
      { skipBecauseFocused: true },
      { prisma, send },
    );
    expect(send).not.toHaveBeenCalled();
    expect(res.skipped).toBe(1);
  });
});
