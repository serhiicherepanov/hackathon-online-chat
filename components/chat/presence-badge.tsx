"use client";

import { PRESENCE_LABEL } from "@/lib/avatar";
import type { PresenceStatus } from "@/lib/realtime/payloads";
import { cn } from "@/lib/utils";

const PRESENCE_TONE: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  afk: "bg-amber-500",
  offline: "bg-muted-foreground/40",
};

function badgeSizeClass(avatarSize: number): string {
  if (avatarSize <= 24) {
    return "h-2.5 w-2.5 ring-1";
  }

  if (avatarSize <= 32) {
    return "h-3 w-3 ring-[1.5px]";
  }

  return "h-3.5 w-3.5 ring-2";
}

export function PresenceBadge({
  status,
  avatarSize,
  className,
  testId,
}: {
  status: PresenceStatus;
  avatarSize: number;
  className?: string;
  testId?: string;
}) {
  return (
    <span
      aria-label={PRESENCE_LABEL[status]}
      className={cn(
        "absolute bottom-0 right-0 rounded-full ring-background",
        badgeSizeClass(avatarSize),
        PRESENCE_TONE[status],
        className,
      )}
      data-testid={testId}
      data-presence={status}
    />
  );
}
