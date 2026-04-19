import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionUser = vi.fn();
const getCurrentSessionId = vi.fn();
const destroyBrowserSession = vi.fn();
const deleteMany = vi.fn();

vi.mock("@/lib/auth/session", () => ({
  requireSessionUser,
  getCurrentSessionId,
  destroyBrowserSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: {
      deleteMany,
    },
  },
}));

describe("DELETE /api/sessions/:id", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("revokes only the targeted session", async () => {
    requireSessionUser.mockResolvedValue({
      ok: true,
      user: {
        id: "user-1",
      },
    });
    getCurrentSessionId.mockResolvedValue("sess-current");
    deleteMany.mockResolvedValue({ count: 1 });

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "sess-other" }),
    });

    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        id: "sess-other",
        userId: "user-1",
      },
    });
    expect(response.status).toBe(204);
    expect(destroyBrowserSession).not.toHaveBeenCalled();
  });

  it("clears the current browser cookie when revoking the current session", async () => {
    requireSessionUser.mockResolvedValue({
      ok: true,
      user: {
        id: "user-1",
      },
    });
    getCurrentSessionId.mockResolvedValue("sess-current");
    deleteMany.mockResolvedValue({ count: 1 });

    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost"), {
      params: Promise.resolve({ id: "sess-current" }),
    });

    expect(response.status).toBe(204);
    expect(destroyBrowserSession).toHaveBeenCalledTimes(1);
  });
});
