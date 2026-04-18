import { describe, it, expect } from "vitest";
import {
  computePresenceStatus,
  consumePresenceTransition,
  peekPresenceStatus,
} from "./transitions";

describe("consumePresenceTransition", () => {
  it("returns true on the first observation", () => {
    const userId = `u-${Math.random()}`;
    expect(consumePresenceTransition(userId, "online")).toBe(true);
  });

  it("returns false when the state does not change", () => {
    const userId = `u-${Math.random()}`;
    consumePresenceTransition(userId, "online");
    expect(consumePresenceTransition(userId, "online")).toBe(false);
  });

  it("returns true when status flips online -> afk -> offline -> online", () => {
    const userId = `u-${Math.random()}`;
    expect(consumePresenceTransition(userId, "online")).toBe(true);
    expect(consumePresenceTransition(userId, "afk")).toBe(true);
    expect(consumePresenceTransition(userId, "afk")).toBe(false);
    expect(consumePresenceTransition(userId, "offline")).toBe(true);
    expect(consumePresenceTransition(userId, "online")).toBe(true);
  });

  it("peekPresenceStatus reflects the last consumed status", () => {
    const userId = `u-${Math.random()}`;
    expect(peekPresenceStatus(userId)).toBeUndefined();
    consumePresenceTransition(userId, "online");
    expect(peekPresenceStatus(userId)).toBe("online");
    consumePresenceTransition(userId, "offline");
    expect(peekPresenceStatus(userId)).toBe("offline");
  });
});

describe("computePresenceStatus", () => {
  const now = new Date("2024-01-01T00:00:00Z");

  it("returns offline when no Centrifugo connections", () => {
    expect(
      computePresenceStatus({ connectionCount: 0, lastActiveAt: now, now }),
    ).toBe("offline");
  });

  it("returns online when connections exist and activity is within window", () => {
    expect(
      computePresenceStatus({
        connectionCount: 2,
        lastActiveAt: new Date(now.getTime() - 10_000),
        now,
      }),
    ).toBe("online");
  });

  it("returns afk when activity is older than the window", () => {
    expect(
      computePresenceStatus({
        connectionCount: 1,
        lastActiveAt: new Date(now.getTime() - 90_000),
        now,
      }),
    ).toBe("afk");
  });

  it("returns afk when connections exist but lastActiveAt is unknown", () => {
    expect(
      computePresenceStatus({
        connectionCount: 1,
        lastActiveAt: null,
        now,
      }),
    ).toBe("afk");
  });
});
