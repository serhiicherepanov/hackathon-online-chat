import { create } from "zustand";

type ActiveConversationStore = {
  conversationId: string | null;
  setConversationId: (id: string | null) => void;
};

export const useActiveConversationStore = create<ActiveConversationStore>(
  (set) => ({
    conversationId: null,
    setConversationId: (conversationId) => set({ conversationId }),
  }),
);
