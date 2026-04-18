import { describe, it, expect } from "vitest";
import {
  consumePresenceTransition,
  peekPresenceOnline,
} from "./transitions";

describe("consumePresenceTransition", () => {
  it("returns true on the first observation", () => {
    const userId = `u-${Math.random()}`;
    expect(consumePresenceTransition(userId, true)).toBe(true);
  });

  it("returns false when the state does not change", () => {
    const userId = `u-${Math.random()}`;
    consumePresenceTransition(userId, true);
    expect(consumePresenceTransition(userId, true)).toBe(false);
  });

  it("returns true when state flips online -> offline -> online", () => {
    const userId = `u-${Math.random()}`;
    expect(consumePresenceTransition(userId, true)).toBe(true);
    expect(consumePresenceTransition(userId, false)).toBe(true);
    expect(consumePresenceTransition(userId, false)).toBe(false);
    expect(consumePresenceTransition(userId, true)).toBe(true);
  });

  it("peekPresenceOnline reflects the last consumed state", () => {
    const userId = `u-${Math.random()}`;
    expect(peekPresenceOnline(userId)).toBeUndefined();
    consumePresenceTransition(userId, true);
    expect(peekPresenceOnline(userId)).toBe(true);
    consumePresenceTransition(userId, false);
    expect(peekPresenceOnline(userId)).toBe(false);
  });
});
