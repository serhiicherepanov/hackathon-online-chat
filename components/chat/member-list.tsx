"use client";

import { useEffect } from "react";
import { usePresenceStore, type PresenceRow } from "@/lib/stores/presence-store";
import type { MemberRow } from "@/lib/hooks/use-members";
import type { PresenceStatus } from "@/lib/realtime/payloads";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<PresenceStatus, string> = {
  online: "Online",
  afk: "Away",
  offline: "Offline",
};

const STATUS_DOT: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  afk: "bg-amber-500",
  offline: "bg-muted-foreground/40",
};

export function MemberList({ members }: { members: MemberRow[] | undefined }) {
  const map = usePresenceStore((s) => s.map);
  const merge = usePresenceStore((s) => s.merge);

  useEffect(() => {
    if (!members?.length) return;
    const ids = members.map((m) => m.userId).join(",");
    const poll = () => {
      void fetch(`/api/presence?userIds=${encodeURIComponent(ids)}`)
        .then((r) => r.json())
        .then((j: { presence: PresenceRow[] }) => {
          merge(j.presence ?? []);
        })
        .catch(() => undefined);
    };
    poll();
    const handle = window.setInterval(poll, 5000);
    return () => window.clearInterval(handle);
  }, [members, merge]);

  if (!members) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  }

  return (
    <div className="space-y-2">
      {members.map((m) => {
        const status: PresenceStatus = map[m.userId] ?? "offline";
        return (
          <div
            key={m.userId}
            className="flex items-center gap-2 text-sm"
            data-testid={`member-${m.username}`}
            data-presence={status}
            title={STATUS_LABEL[status]}
          >
            <span
              className={cn("inline-block h-2 w-2 rounded-full", STATUS_DOT[status])}
              aria-label={STATUS_LABEL[status]}
            />
            <span className="font-medium">{m.username}</span>
            <span className="text-xs text-muted-foreground">({m.role})</span>
          </div>
        );
      })}
    </div>
  );
}
