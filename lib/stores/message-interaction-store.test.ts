import { beforeEach, describe, expect, it } from "vitest";
import { useMessageInteractionStore } from "./message-interaction-store";

describe("message interaction store", () => {
  beforeEach(() => {
    useMessageInteractionStore.setState({
      editRequestId: null,
      flashMessageId: null,
      flashNonce: 0,
    });
  });

  it("stores and clears the edit request target", () => {
    const s = useMessageInteractionStore.getState();
    s.requestEdit("m1");
    expect(useMessageInteractionStore.getState().editRequestId).toBe("m1");
    s.clearEditRequest();
    expect(useMessageInteractionStore.getState().editRequestId).toBeNull();
  });

  it("advances the flash nonce on every flash call so repeats retrigger", () => {
    const s = useMessageInteractionStore.getState();
    const before = useMessageInteractionStore.getState().flashNonce;
    s.flashMessage("m1");
    const afterFirst = useMessageInteractionStore.getState();
    expect(afterFirst.flashMessageId).toBe("m1");
    expect(afterFirst.flashNonce).toBe(before + 1);

    useMessageInteractionStore.getState().flashMessage("m1");
    expect(useMessageInteractionStore.getState().flashNonce).toBe(before + 2);
  });

  it("clears the flash message id", () => {
    const s = useMessageInteractionStore.getState();
    s.flashMessage("m1");
    s.clearFlash();
    expect(useMessageInteractionStore.getState().flashMessageId).toBeNull();
  });
});
