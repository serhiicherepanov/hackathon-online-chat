import { describe, it, expect, beforeEach } from "vitest";
import { usePresenceStore } from "./presence-store";

const reset = () => usePresenceStore.setState({ map: {} });

describe("usePresenceStore", () => {
  beforeEach(reset);

  it("merges arrays of presence rows", () => {
    usePresenceStore.getState().merge([
      { userId: "u1", online: true },
      { userId: "u2", online: false },
    ]);
    expect(usePresenceStore.getState().map).toEqual({ u1: true, u2: false });
  });

  it("setOnline flips a single user without clobbering others", () => {
    usePresenceStore.getState().merge([{ userId: "u1", online: true }]);
    usePresenceStore.getState().setOnline("u2", true);
    expect(usePresenceStore.getState().map).toEqual({ u1: true, u2: true });
  });

  it("later merges override earlier values for the same user", () => {
    const s = usePresenceStore.getState();
    s.merge([{ userId: "u1", online: true }]);
    s.merge([{ userId: "u1", online: false }]);
    expect(usePresenceStore.getState().map.u1).toBe(false);
  });
});
