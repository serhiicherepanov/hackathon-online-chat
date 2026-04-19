"use client";

import { cn } from "@/lib/utils";

export function UnreadBadge({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  const hasUnread = count > 0;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums",
        hasUnread
          ? "bg-primary text-primary-foreground shadow-sm"
          : "pointer-events-none invisible",
        className,
      )}
      data-testid="unread-badge"
      data-unread={hasUnread ? "true" : "false"}
      data-count={count}
      aria-hidden={!hasUnread}
    >
      {hasUnread ? label : "0"}
    </span>
  );
}
