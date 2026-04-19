import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionUser = vi.fn();
const touchSessionLastSeen = vi.fn();
const getCurrentSessionId = vi.fn();
const findMany = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser,
  touchSessionLastSeen,
  getCurrentSessionId,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      findMany,
    },
  },
}));

describe("GET /api/sessions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("lists the caller's sessions and marks the current browser", async () => {
    requireSessionUser.mockResolvedValue({
      ok: true,
      user: {
        id: "user-1",
      },
    });
    touchSessionLastSeen.mockResolvedValue(undefined);
    getCurrentSessionId.mockResolvedValue("sess-current");
    findMany.mockResolvedValue([
      {
        id: "sess-current",
        createdAt: new Date("2026-04-19T10:00:00.000Z"),
        lastSeenAt: new Date("2026-04-19T10:10:00.000Z"),
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
        ip: "127.0.0.1",
      },
      {
        id: "sess-other",
        createdAt: new Date("2026-04-18T10:00:00.000Z"),
        lastSeenAt: new Date("2026-04-18T10:10:00.000Z"),
        userAgent: null,
        ip: null,
      },
    ]);

    const { GET } = await import("./route");
    const response = await GET();

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    });
    await expect(response.json()).resolves.toEqual({
      sessions: [
        {
          id: "sess-current",
          current: true,
          createdAt: "2026-04-19T10:00:00.000Z",
          lastSeenAt: "2026-04-19T10:10:00.000Z",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
          ip: "127.0.0.1",
          browserLabel: "Chrome on Windows",
        },
        {
          id: "sess-other",
          current: false,
          createdAt: "2026-04-18T10:00:00.000Z",
          lastSeenAt: "2026-04-18T10:10:00.000Z",
          userAgent: null,
          ip: null,
          browserLabel: "Unknown browser",
        },
      ],
    });
  });
});
