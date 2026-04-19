"use client";

import Avatar from "boring-avatars";
import { cn } from "@/lib/utils";

const AVATAR_COLORS = ["#5B8DEF", "#F4A259", "#8CB369", "#BC4749", "#6A4C93"];

export function UserAvatar({
  userId,
  username,
  size = 32,
  className,
}: {
  userId: string;
  username?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex shrink-0 overflow-hidden rounded-full", className)}
      aria-label={username ? `${username} avatar` : "user avatar"}
      data-testid="user-avatar"
      data-user-id={userId}
    >
      <Avatar
        size={size}
        name={userId}
        variant="beam"
        colors={AVATAR_COLORS}
        square={false}
      />
    </span>
  );
}
