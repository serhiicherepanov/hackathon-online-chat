import { beforeEach, describe, expect, it } from "vitest";
import { useComposerStore } from "./composer-store";

describe("composer store", () => {
  beforeEach(() => {
    useComposerStore.setState({ byConv: {} });
  });

  it("sets and clears reply target per conversation", () => {
    const s = useComposerStore.getState();
    s.setReplyTarget("c1", { id: "m1", authorUsername: "a", bodyPreview: "hi" });
    expect(useComposerStore.getState().byConv.c1.replyTarget?.id).toBe("m1");
    s.clearReplyTarget("c1");
    expect(useComposerStore.getState().byConv.c1.replyTarget).toBeNull();
  });

  it("stages and unstages attachments", () => {
    const s = useComposerStore.getState();
    s.addStaged("c1", {
      localId: "l1",
      state: "uploading",
      name: "a.png",
      size: 10,
      progress: 0,
    });
    expect(useComposerStore.getState().byConv.c1.staged).toHaveLength(1);
    s.updateStaged("c1", "l1", { progress: 50 } as never);
    expect(
      (useComposerStore.getState().byConv.c1.staged[0] as { progress: number })
        .progress,
    ).toBe(50);
    s.removeStaged("c1", "l1");
    expect(useComposerStore.getState().byConv.c1.staged).toHaveLength(0);
  });

  it("reset wipes conversation state", () => {
    const s = useComposerStore.getState();
    s.setReplyTarget("c1", { id: "m1", authorUsername: "a", bodyPreview: "p" });
    s.addStaged("c1", {
      localId: "l1",
      state: "uploading",
      name: "a",
      size: 1,
      progress: 0,
    });
    s.reset("c1");
    const cur = useComposerStore.getState().byConv.c1;
    expect(cur.replyTarget).toBeNull();
    expect(cur.staged).toHaveLength(0);
  });
});
