"use client";

import { Hash, Lock } from "lucide-react";
import type { RoomVisibility } from "@prisma/client";
import { cn } from "@/lib/utils";

export function RoomVisibilityIcon({
  visibility,
  roomName,
  size = 24,
  className,
  testId,
}: {
  visibility: RoomVisibility;
  roomName: string;
  size?: number;
  className?: string;
  testId?: string;
}) {
  const isPrivate = visibility === "private";
  const Icon = isPrivate ? Lock : Hash;
  const label = isPrivate
    ? `${roomName} (private room)`
    : `${roomName} (public room)`;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50 text-muted-foreground",
        className,
      )}
      aria-label={label}
      title={label}
      data-testid={testId ?? "room-visibility-icon"}
      data-room-visibility={visibility}
      style={{ width: size, height: size }}
    >
      <Icon
        aria-hidden
        className="text-foreground/70"
        style={{ width: Math.round(size * 0.55), height: Math.round(size * 0.55) }}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
