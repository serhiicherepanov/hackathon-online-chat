import { create } from "zustand";

export type AppToast = {
  id: string;
  title: string;
  description?: string;
};

type ToastState = {
  toasts: AppToast[];
  push: (toast: AppToast) => void;
  remove: (id: string) => void;
};

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) =>
    set((state) => ({
      toasts: [...state.toasts.filter((item) => item.id !== toast.id), toast],
    })),
  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));
