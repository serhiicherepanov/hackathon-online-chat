import { describe, expect, it } from "vitest";
import {
  ACTIVITY_WINDOW_MS,
  shouldBeat,
} from "./activity";

describe("shouldBeat", () => {
  it("returns true for recent activity", () => {
    expect(
      shouldBeat({
        now: 30_000,
        lastActivityAt: 10_000,
      }),
    ).toBe(true);
  });

  it("returns false for stale activity", () => {
    expect(
      shouldBeat({
        now: 30_001,
        lastActivityAt: 5_000,
      }),
    ).toBe(false);
  });

  it("returns false when activity is unknown", () => {
    expect(
      shouldBeat({
        now: 30_000,
        lastActivityAt: null,
      }),
    ).toBe(false);
  });

  it("returns true at the activity window boundary", () => {
    expect(
      shouldBeat({
        now: ACTIVITY_WINDOW_MS,
        lastActivityAt: 0,
      }),
    ).toBe(true);
  });

  it("uses the default activity window when none is provided", () => {
    expect(
      shouldBeat({
        now: ACTIVITY_WINDOW_MS - 1,
        lastActivityAt: 0,
      }),
    ).toBe(true);
  });
});
