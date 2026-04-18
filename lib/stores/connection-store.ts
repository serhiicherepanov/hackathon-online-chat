import { create } from "zustand";

export type ConnectionState = "disconnected" | "connecting" | "connected";

type ConnectionStore = {
  state: ConnectionState;
  setState: (next: ConnectionState) => void;
};

export const useConnectionStore = create<ConnectionStore>((set) => ({
  state: "disconnected",
  setState: (next) => set({ state: next }),
}));
