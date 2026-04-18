import { create } from "zustand";
import type { PresenceStatus } from "@/lib/realtime/payloads";

export type PresenceRow = {
  userId: string;
  status: PresenceStatus;
  online?: boolean;
  lastActiveAt?: string | null;
};

type PresenceStore = {
  map: Record<string, PresenceStatus>;
  merge: (rows: PresenceRow[]) => void;
  setStatus: (userId: string, status: PresenceStatus) => void;
};

function rowToStatus(row: PresenceRow): PresenceStatus {
  if (row.status) return row.status;
  return row.online === false ? "offline" : "online";
}

export const usePresenceStore = create<PresenceStore>((set) => ({
  map: {},
  merge: (rows) =>
    set((s) => ({
      map: {
        ...s.map,
        ...Object.fromEntries(rows.map((r) => [r.userId, rowToStatus(r)])),
      },
    })),
  setStatus: (userId, status) =>
    set((s) => ({ map: { ...s.map, [userId]: status } })),
}));
