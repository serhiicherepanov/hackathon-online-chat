"use client";

import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "@/components/ui/button";
import { reportError } from "@/lib/report-error";

export function QueryBoundary({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary
          onError={(err) => reportError(err, { boundary: "query" })}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div className="rounded-md border border-border bg-card p-4 text-sm">
              <p className="font-medium">Something went wrong loading data.</p>
              <p className="mt-2 text-muted-foreground">{String(error)}</p>
              <Button
                className="mt-4"
                type="button"
                variant="secondary"
                onClick={() => {
                  reset();
                  resetErrorBoundary();
                }}
              >
                Retry
              </Button>
            </div>
          )}
        >
          {children}
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
