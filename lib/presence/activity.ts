export const HEARTBEAT_INTERVAL_MS = 20_000;
export const ACTIVITY_WINDOW_MS = 25_000;
export const ACTIVITY_THROTTLE_MS = 1_000;

type ShouldBeatArgs = {
  now: number;
  lastActivityAt: number | null;
  activityWindowMs?: number;
};

export function shouldBeat({
  now,
  lastActivityAt,
  activityWindowMs = ACTIVITY_WINDOW_MS,
}: ShouldBeatArgs): boolean {
  if (lastActivityAt === null) {
    return false;
  }

  return now - lastActivityAt <= activityWindowMs;
}
