"use client";

import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";

export function CentrifugeBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      onError={(err) => reportError(err, { boundary: "centrifuge" })}
      fallbackRender={({ error, resetErrorBoundary }) => (
        <div className="m-4 rounded-md border border-border bg-card p-4 text-sm">
          <p className="font-medium">Realtime connection failed.</p>
          <p className="mt-2 text-muted-foreground">{String(error)}</p>
          <Button
            className="mt-4"
            type="button"
            variant="secondary"
            onClick={() => resetErrorBoundary()}
          >
            Retry
          </Button>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
