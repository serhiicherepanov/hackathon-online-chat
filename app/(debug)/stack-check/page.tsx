"use client";

// TODO(delete-in-next-change): This page is a skeleton smoke-test that proves
// TanStack Query, Centrifugo, and React Virtuoso are wired. Delete it when the
// first real feature change lands.

import { useQuery } from "@tanstack/react-query";
import { Virtuoso } from "react-virtuoso";
import { useConnectionStore } from "@/lib/stores/connection-store";

type HealthResponse = { status: string; db: string };

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("/api/health");
  if (!res.ok && res.status !== 503) {
    throw new Error(`Health check HTTP ${res.status}`);
  }
  return (await res.json()) as HealthResponse;
}

export default function StackCheckPage() {
  const connection = useConnectionStore((s) => s.state);
  const health = useQuery({ queryKey: ["health"], queryFn: fetchHealth });

  const items = Array.from({ length: 100 }, (_, i) => i);

  return (
    <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Stack check</h1>
        <p className="text-sm text-muted-foreground">
          Proves that TanStack Query, Centrifugo, and React Virtuoso are all
          wired. Delete when feature work lands.
        </p>
      </header>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-2 font-medium">TanStack Query · /api/health</h2>
        {health.isPending && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {health.isError && (
          <p className="text-sm text-destructive">
            Error: {(health.error as Error).message}
          </p>
        )}
        {health.data && (
          <pre className="text-sm">{JSON.stringify(health.data, null, 2)}</pre>
        )}
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-2 font-medium">Centrifugo connection</h2>
        <p className="text-sm">
          State:{" "}
          <span
            data-testid="centrifugo-state"
            className={
              connection === "connected"
                ? "font-semibold text-green-600"
                : connection === "connecting"
                  ? "font-semibold text-amber-600"
                  : "font-semibold text-muted-foreground"
            }
          >
            {connection}
          </span>
        </p>
      </section>

      <section className="rounded-md border border-border bg-card p-4">
        <h2 className="mb-2 font-medium">React Virtuoso · 100 rows</h2>
        <div className="h-64 overflow-hidden rounded border border-border">
          <Virtuoso
            data={items}
            itemContent={(index, item) => (
              <div className="border-b border-border px-3 py-2 text-sm">
                Row #{index} · value {item}
              </div>
            )}
          />
        </div>
      </section>
    </main>
  );
}
