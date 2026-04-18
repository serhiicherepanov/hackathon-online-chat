import { create } from "zustand";

type UnreadStore = {
  map: Record<string, number>;
  setFromServer: (rows: { conversationId: string; unread: number }[]) => void;
  mergeDelta: (conversationId: string, delta: number) => void;
  setCount: (conversationId: string, unread: number) => void;
  clear: (conversationId: string) => void;
};

export const useUnreadStore = create<UnreadStore>((set, get) => ({
  map: {},
  setFromServer: (rows) =>
    set({
      map: Object.fromEntries(rows.map((r) => [r.conversationId, r.unread])),
    }),
  mergeDelta: (conversationId, delta) =>
    set({
      map: {
        ...get().map,
        [conversationId]: Math.max(0, (get().map[conversationId] ?? 0) + delta),
      },
    }),
  setCount: (conversationId, unread) =>
    set({
      map: { ...get().map, [conversationId]: unread },
    }),
  clear: (conversationId) =>
    set({
      map: { ...get().map, [conversationId]: 0 },
    }),
}));
