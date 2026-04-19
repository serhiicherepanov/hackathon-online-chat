import { create } from "zustand";

type State = {
  editRequestId: string | null;
  flashMessageId: string | null;
  flashNonce: number;

  requestEdit: (messageId: string) => void;
  clearEditRequest: () => void;

  flashMessage: (messageId: string) => void;
  clearFlash: () => void;
};

export const useMessageInteractionStore = create<State>((set) => ({
  editRequestId: null,
  flashMessageId: null,
  flashNonce: 0,

  requestEdit: (messageId) => set({ editRequestId: messageId }),
  clearEditRequest: () => set({ editRequestId: null }),

  flashMessage: (messageId) =>
    set((s) => ({
      flashMessageId: messageId,
      flashNonce: s.flashNonce + 1,
    })),
  clearFlash: () => set({ flashMessageId: null }),
}));
