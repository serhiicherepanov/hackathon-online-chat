import { beforeEach, describe, expect, it } from "vitest";
import { TYPING_EXPIRY_MS, useTypingStore } from "./typing-store";

const reset = () => useTypingStore.setState({ byConv: {} });

describe("useTypingStore", () => {
  beforeEach(reset);

  it("upserts a new typing entry with an expiry timestamp", () => {
    const now = 1000;
    useTypingStore.getState().upsert("c1", { userId: "u1", username: "alice" }, now);
    expect(useTypingStore.getState().activeFor("c1", now)).toEqual([
      { userId: "u1", username: "alice", expiresAt: now + TYPING_EXPIRY_MS },
    ]);
  });

  it("refreshes the expiry when the same user types again", () => {
    useTypingStore.getState().upsert("c1", { userId: "u1", username: "alice" }, 1000);
    useTypingStore.getState().upsert("c1", { userId: "u1", username: "alice" }, 2000);
    const entries = useTypingStore.getState().byConv.c1;
    expect(entries).toHaveLength(1);
    expect(entries[0].expiresAt).toBe(2000 + TYPING_EXPIRY_MS);
  });

  it("activeFor filters out entries that have expired", () => {
    useTypingStore.getState().upsert("c1", { userId: "u1", username: "alice" }, 1000);
    const later = 1000 + TYPING_EXPIRY_MS + 1;
    expect(useTypingStore.getState().activeFor("c1", later)).toEqual([]);
  });

  it("prune removes expired entries and empty conversations", () => {
    useTypingStore.getState().upsert("c1", { userId: "u1", username: "alice" }, 1000);
    useTypingStore.getState().upsert("c2", { userId: "u2", username: "bob" }, 5000);
    useTypingStore.getState().prune(1000 + TYPING_EXPIRY_MS + 1);
    const state = useTypingStore.getState().byConv;
    expect(state.c1).toBeUndefined();
    expect(state.c2).toHaveLength(1);
  });

  it("clearConversation drops the conversation bucket entirely", () => {
    useTypingStore.getState().upsert("c1", { userId: "u1", username: "alice" });
    useTypingStore.getState().clearConversation("c1");
    expect(useTypingStore.getState().byConv.c1).toBeUndefined();
  });
});
