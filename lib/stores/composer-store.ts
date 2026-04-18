import { create } from "zustand";
import type { AttachmentDto } from "@/lib/types/chat";

export type ReplyTarget = {
  id: string;
  authorUsername: string;
  bodyPreview: string;
};

export type StagedAttachment =
  | { localId: string; state: "uploading"; name: string; size: number; progress: number }
  | {
      localId: string;
      state: "uploaded";
      name: string;
      size: number;
      progress: 100;
      attachment: AttachmentDto;
    }
  | { localId: string; state: "error"; name: string; size: number; error: string };

type ConversationState = {
  replyTarget: ReplyTarget | null;
  staged: StagedAttachment[];
};

type ComposerState = {
  byConv: Record<string, ConversationState>;
  setReplyTarget: (convId: string, target: ReplyTarget | null) => void;
  clearReplyTarget: (convId: string) => void;
  addStaged: (convId: string, s: StagedAttachment) => void;
  updateStaged: (
    convId: string,
    localId: string,
    patch: Partial<StagedAttachment>,
  ) => void;
  removeStaged: (convId: string, localId: string) => void;
  clearStaged: (convId: string) => void;
  reset: (convId: string) => void;
};

const empty = (): ConversationState => ({ replyTarget: null, staged: [] });

export const useComposerStore = create<ComposerState>((set) => ({
  byConv: {},
  setReplyTarget: (convId, target) =>
    set((s) => ({
      byConv: {
        ...s.byConv,
        [convId]: { ...(s.byConv[convId] ?? empty()), replyTarget: target },
      },
    })),
  clearReplyTarget: (convId) =>
    set((s) => ({
      byConv: {
        ...s.byConv,
        [convId]: { ...(s.byConv[convId] ?? empty()), replyTarget: null },
      },
    })),
  addStaged: (convId, item) =>
    set((s) => ({
      byConv: {
        ...s.byConv,
        [convId]: {
          ...(s.byConv[convId] ?? empty()),
          staged: [...(s.byConv[convId]?.staged ?? []), item],
        },
      },
    })),
  updateStaged: (convId, localId, patch) =>
    set((s) => {
      const cur = s.byConv[convId] ?? empty();
      return {
        byConv: {
          ...s.byConv,
          [convId]: {
            ...cur,
            staged: cur.staged.map((x) =>
              x.localId === localId ? ({ ...x, ...patch } as StagedAttachment) : x,
            ),
          },
        },
      };
    }),
  removeStaged: (convId, localId) =>
    set((s) => {
      const cur = s.byConv[convId] ?? empty();
      return {
        byConv: {
          ...s.byConv,
          [convId]: {
            ...cur,
            staged: cur.staged.filter((x) => x.localId !== localId),
          },
        },
      };
    }),
  clearStaged: (convId) =>
    set((s) => ({
      byConv: {
        ...s.byConv,
        [convId]: { ...(s.byConv[convId] ?? empty()), staged: [] },
      },
    })),
  reset: (convId) =>
    set((s) => ({ byConv: { ...s.byConv, [convId]: empty() } })),
}));
