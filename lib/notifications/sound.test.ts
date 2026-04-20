import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __internals,
  __resetSoundForTests,
  isUnlocked,
  play,
  unlock,
} from "./sound";

function setupAudio() {
  const calls: Array<{ play: number; pause: number }> = [];
  class FakeAudio {
    public volume = 0;
    public currentTime = 0;
    public preload = "";
    public src: string;
    private stats = { play: 0, pause: 0 };
    constructor(src: string) {
      this.src = src;
      calls.push(this.stats);
    }
    play() {
      this.stats.play += 1;
      return Promise.resolve();
    }
    pause() {
      this.stats.pause += 1;
    }
  }
  (globalThis as unknown as { Audio: typeof FakeAudio }).Audio = FakeAudio;
  return calls;
}

describe("sound.ts", () => {
  beforeEach(() => {
    __resetSoundForTests();
  });

  it("unlock is idempotent and primes every audio element once", () => {
    const calls = setupAudio();
    expect(isUnlocked()).toBe(false);
    unlock();
    expect(isUnlocked()).toBe(true);
    const playedAfterFirst = calls.map((c) => c.play);
    unlock();
    const playedAfterSecond = calls.map((c) => c.play);
    expect(playedAfterFirst).toEqual(playedAfterSecond);
    expect(playedAfterFirst.every((n) => n === 1)).toBe(true);
  });

  it("throttles rapid play() calls per category", () => {
    const calls = setupAudio();
    play("dm", "normal");
    play("dm", "normal");
    play("dm", "normal");
    const dmCall = calls[0];
    expect(dmCall.play).toBe(1);
  });

  it("off level short-circuits play()", () => {
    const calls = setupAudio();
    play("dm", "off");
    // off short-circuits before constructing any Audio element
    expect(calls.length).toBe(0);
  });

  it("getAutoplayPolicy === 'disallowed' short-circuits", () => {
    const calls = setupAudio();
    (navigator as unknown as { getAutoplayPolicy: () => string }).getAutoplayPolicy =
      () => "disallowed";
    play("dm", "normal");
    expect(calls.length).toBe(0);
    delete (navigator as unknown as { getAutoplayPolicy?: unknown }).getAutoplayPolicy;
  });

  it("volume map covers all four levels", () => {
    expect(__internals.VOLUMES.off).toBe(0);
    expect(__internals.VOLUMES.soft).toBeCloseTo(0.3);
    expect(__internals.VOLUMES.normal).toBeCloseTo(0.7);
    expect(__internals.VOLUMES.loud).toBe(1);
  });

  it("mention throttle is shorter than DM throttle", () => {
    expect(__internals.THROTTLES.mention).toBeLessThan(__internals.THROTTLES.dm);
  });

  // Throttle expiry test
  it("allows second play after throttle elapses", () => {
    const calls = setupAudio();
    const orig = Date.now;
    let t = 1_000_000;
    Date.now = () => t;
    try {
      play("dm", "normal");
      // getPool created 4 Audio elements; the first one is dm (per SOURCES order).
      expect(calls.length).toBeGreaterThanOrEqual(4);
      expect(calls[0].play).toBe(1);
      t += __internals.THROTTLES.dm + 1;
      play("dm", "normal");
      expect(calls[0].play).toBe(2);
    } finally {
      Date.now = orig;
      vi.restoreAllMocks();
    }
  });
});
