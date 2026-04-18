import { describe, it, expect, beforeEach } from "vitest";
import { usePresenceStore, type PresenceRow } from "./presence-store";

type PresenceRowArg = PresenceRow;

const reset = () => usePresenceStore.setState({ map: {} });

describe("usePresenceStore", () => {
  beforeEach(reset);

  it("merges rows using the rich status", () => {
    usePresenceStore.getState().merge([
      { userId: "u1", status: "online" },
      { userId: "u2", status: "afk" },
      { userId: "u3", status: "offline" },
    ]);
    expect(usePresenceStore.getState().map).toEqual({
      u1: "online",
      u2: "afk",
      u3: "offline",
    });
  });

  it("setStatus flips a single user without clobbering others", () => {
    usePresenceStore.getState().merge([{ userId: "u1", status: "online" }]);
    usePresenceStore.getState().setStatus("u2", "afk");
    expect(usePresenceStore.getState().map).toEqual({
      u1: "online",
      u2: "afk",
    });
  });

  it("later merges override earlier values for the same user", () => {
    const s = usePresenceStore.getState();
    s.merge([{ userId: "u1", status: "online" }]);
    s.merge([{ userId: "u1", status: "offline" }]);
    expect(usePresenceStore.getState().map.u1).toBe("offline");
  });

  it("falls back from legacy boolean online payloads when status is absent", () => {
    const merge = usePresenceStore.getState().merge;
    merge([
      { userId: "u1", online: true } as unknown as PresenceRowArg,
      { userId: "u2", online: false } as unknown as PresenceRowArg,
    ]);
    expect(usePresenceStore.getState().map).toEqual({
      u1: "online",
      u2: "offline",
    });
  });
});
