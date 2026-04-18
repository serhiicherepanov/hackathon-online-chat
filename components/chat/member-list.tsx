"use client";

import { useEffect } from "react";
import { usePresenceStore } from "@/lib/stores/presence-store";
import type { MemberRow } from "@/lib/hooks/use-members";
import { cn } from "@/lib/utils";

export function MemberList({ members }: { members: MemberRow[] | undefined }) {
  const map = usePresenceStore((s) => s.map);
  const merge = usePresenceStore((s) => s.merge);

  useEffect(() => {
    if (!members?.length) return;
    const ids = members.map((m) => m.userId).join(",");
    const poll = () => {
      void fetch(`/api/presence?userIds=${encodeURIComponent(ids)}`)
        .then((r) => r.json())
        .then((j: { presence: { userId: string; online: boolean }[] }) => {
          merge(j.presence ?? []);
        })
        .catch(() => undefined);
    };
    poll();
    const handle = window.setInterval(poll, 3000);
    return () => window.clearInterval(handle);
  }, [members, merge]);

  if (!members) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  }

  return (
    <div className="space-y-2">
      {members.map((m) => {
        const online = map[m.userId] ?? false;
        return (
          <div
            key={m.userId}
            className="flex items-center gap-2 text-sm"
            data-testid={`member-${m.username}`}
            data-online={online ? "true" : "false"}
          >
            <span
              className={cn(
                "inline-block h-2 w-2 rounded-full",
                online ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
            />
            <span className="font-medium">{m.username}</span>
            <span className="text-xs text-muted-foreground">({m.role})</span>
          </div>
        );
      })}
    </div>
  );
}
