import { describe, expect, it } from "vitest";
import {
  getUserDisplayName,
  serializeSessionSummary,
  summarizeUserAgent,
} from "./serialize";

describe("auth serialization helpers", () => {
  it("prefers displayName when present", () => {
    expect(
      getUserDisplayName({ username: "alice", displayName: "Alice Example" }),
    ).toBe("Alice Example");
    expect(getUserDisplayName({ username: "alice", displayName: null })).toBe(
      "alice",
    );
  });

  it("summarizes common browser user agents", () => {
    expect(
      summarizeUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36",
      ),
    ).toBe("Chrome on macOS");
    expect(summarizeUserAgent(null)).toBe("Unknown browser");
  });

  it("marks the current session when serializing summaries", () => {
    expect(
      serializeSessionSummary(
        {
          id: "sess-1",
          createdAt: new Date("2026-04-19T10:00:00.000Z"),
          lastSeenAt: new Date("2026-04-19T10:15:00.000Z"),
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
          ip: "127.0.0.1",
        },
        "sess-1",
      ),
    ).toEqual({
      id: "sess-1",
      current: true,
      createdAt: "2026-04-19T10:00:00.000Z",
      lastSeenAt: "2026-04-19T10:15:00.000Z",
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
      ip: "127.0.0.1",
      browserLabel: "Chrome on Windows",
    });
  });
});
