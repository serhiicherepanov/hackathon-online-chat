import { create } from "zustand";

type PresenceStore = {
  map: Record<string, boolean>;
  merge: (rows: { userId: string; online: boolean }[]) => void;
  setOnline: (userId: string, online: boolean) => void;
};

export const usePresenceStore = create<PresenceStore>((set) => ({
  map: {},
  merge: (rows) =>
    set((s) => ({
      map: { ...s.map, ...Object.fromEntries(rows.map((r) => [r.userId, r.online])) },
    })),
  setOnline: (userId, online) =>
    set((s) => ({ map: { ...s.map, [userId]: online } })),
}));
