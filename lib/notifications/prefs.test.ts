import { describe, expect, it } from "vitest";
import { computeMuteUntil, isMuted, DEFAULT_PREFS } from "./prefs";

describe("computeMuteUntil", () => {
  const fixed = new Date("2026-04-20T10:00:00");

  it("1h → +60min", () => {
    const until = computeMuteUntil("1h", fixed);
    expect(until).toBe(fixed.getTime() + 60 * 60 * 1000);
  });

  it("8h → +480min", () => {
    const until = computeMuteUntil("8h", fixed);
    expect(until).toBe(fixed.getTime() + 8 * 60 * 60 * 1000);
  });

  it("tomorrow8am when it's already past 08:00 today", () => {
    const until = computeMuteUntil("tomorrow8am", fixed);
    const expected = new Date(fixed);
    expected.setDate(expected.getDate() + 1);
    expected.setHours(8, 0, 0, 0);
    expect(until).toBe(expected.getTime());
  });

  it("tomorrow8am when now is before 08:00 schedules today's 08:00", () => {
    const early = new Date("2026-04-20T06:00:00");
    const until = computeMuteUntil("tomorrow8am", early);
    const expected = new Date(early);
    expected.setHours(8, 0, 0, 0);
    expect(until).toBe(expected.getTime());
  });

  it("indefinite → effectively forever", () => {
    expect(computeMuteUntil("indefinite", fixed)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("resume → null", () => {
    expect(computeMuteUntil("resume", fixed)).toBeNull();
  });
});

describe("isMuted", () => {
  it("false when muteUntil is null", () => {
    expect(isMuted(DEFAULT_PREFS)).toBe(false);
  });

  it("true when muteUntil in future", () => {
    expect(isMuted({ ...DEFAULT_PREFS, muteUntil: Date.now() + 1000 })).toBe(true);
  });

  it("false when muteUntil in past", () => {
    expect(isMuted({ ...DEFAULT_PREFS, muteUntil: Date.now() - 1 })).toBe(false);
  });
});
