import { create } from "zustand";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  createdAt: string;
};

type AuthStore = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
