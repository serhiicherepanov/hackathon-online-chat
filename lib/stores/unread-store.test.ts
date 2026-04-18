import { describe, it, expect, beforeEach } from "vitest";
import { useUnreadStore } from "./unread-store";

const reset = () => useUnreadStore.setState({ map: {} });

describe("useUnreadStore", () => {
  beforeEach(reset);

  it("hydrates from the server payload", () => {
    useUnreadStore.getState().setFromServer([
      { conversationId: "c1", unread: 3 },
      { conversationId: "c2", unread: 0 },
    ]);
    expect(useUnreadStore.getState().map).toEqual({ c1: 3, c2: 0 });
  });

  it("merges deltas and never goes below zero", () => {
    const s = useUnreadStore.getState();
    s.mergeDelta("c1", 2);
    s.mergeDelta("c1", 1);
    expect(useUnreadStore.getState().map.c1).toBe(3);

    s.mergeDelta("c1", -10);
    expect(useUnreadStore.getState().map.c1).toBe(0);
  });

  it("setCount overrides the value; clear resets to zero", () => {
    const s = useUnreadStore.getState();
    s.setCount("c1", 5);
    expect(useUnreadStore.getState().map.c1).toBe(5);

    s.clear("c1");
    expect(useUnreadStore.getState().map.c1).toBe(0);
  });
});
