import { create } from "zustand";

export const TYPING_EXPIRY_MS = 3000;

export type TypingEntry = {
  userId: string;
  username: string;
  expiresAt: number;
};

type TypingStore = {
  byConv: Record<string, TypingEntry[]>;
  upsert: (conversationId: string, entry: Omit<TypingEntry, "expiresAt">, now?: number) => void;
  prune: (now?: number) => void;
  clearConversation: (conversationId: string) => void;
  /** Returns visible typing entries for a conversation after pruning. */
  activeFor: (conversationId: string, now?: number) => TypingEntry[];
};

export const useTypingStore = create<TypingStore>((set, get) => ({
  byConv: {},
  upsert: (conversationId, entry, now = Date.now()) =>
    set((state) => {
      const current = state.byConv[conversationId] ?? [];
      const next = current
        .filter((e) => e.userId !== entry.userId && e.expiresAt > now)
        .concat({
          userId: entry.userId,
          username: entry.username,
          expiresAt: now + TYPING_EXPIRY_MS,
        });
      return { byConv: { ...state.byConv, [conversationId]: next } };
    }),
  prune: (now = Date.now()) =>
    set((state) => {
      let changed = false;
      const next: Record<string, TypingEntry[]> = {};
      for (const [convId, entries] of Object.entries(state.byConv)) {
        const pruned = entries.filter((e) => e.expiresAt > now);
        if (pruned.length !== entries.length) changed = true;
        if (pruned.length > 0) next[convId] = pruned;
      }
      if (!changed && Object.keys(next).length === Object.keys(state.byConv).length) {
        return state;
      }
      return { byConv: next };
    }),
  clearConversation: (conversationId) =>
    set((state) => {
      if (!(conversationId in state.byConv)) return state;
      const { [conversationId]: _, ...rest } = state.byConv;
      void _;
      return { byConv: rest };
    }),
  activeFor: (conversationId, now = Date.now()) => {
    const entries = get().byConv[conversationId] ?? [];
    return entries.filter((e) => e.expiresAt > now);
  },
}));
