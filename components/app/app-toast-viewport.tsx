"use client";

import type { AppToast } from "@/lib/stores/toast-store";

export function AppToastViewport({ toasts }: { toasts: AppToast[] }) {
  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[70] flex w-80 flex-col gap-2"
      data-testid="app-toast-viewport"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto rounded-md border bg-background/95 p-3 shadow-lg"
        >
          <div className="text-sm font-medium">{toast.title}</div>
          {toast.description ? (
            <div className="mt-1 text-xs text-muted-foreground">
              {toast.description}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
