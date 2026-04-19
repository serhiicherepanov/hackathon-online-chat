"use client";

import Avatar from "boring-avatars";
import {
  GENERATED_AVATAR_COLORS,
  getGeneratedAvatarVariant,
  getRoomAvatarSeed,
  getUserAvatarSeed,
  type GeneratedAvatarKind,
} from "@/lib/avatar";
import type { PresenceStatus } from "@/lib/realtime/payloads";
import { PresenceBadge } from "@/components/chat/presence-badge";
import {
  Avatar as RadixAvatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

function GeneratedAvatar({
  kind,
  seed,
  label,
  size,
}: {
  kind: GeneratedAvatarKind;
  seed: string;
  label: string;
  size: number;
}) {
  const variant = getGeneratedAvatarVariant(kind);

  return (
    <span
      className="flex h-full w-full"
      aria-hidden="true"
      data-avatar-style={variant}
    >
      <Avatar
        size={size}
        name={seed}
        variant={variant}
        colors={[...GENERATED_AVATAR_COLORS]}
        square={false}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function UserAvatar({
  userId,
  username,
  avatarUrl,
  size = 32,
  className,
  testId,
  presence,
  presenceTestId,
}: {
  userId: string;
  username?: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
  testId?: string;
  presence?: PresenceStatus;
  presenceTestId?: string;
}) {
  const seed = getUserAvatarSeed(userId);
  const label = username ? `${username} avatar` : "user avatar";

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      aria-label={label}
      data-avatar-image={avatarUrl ? "uploaded" : "generated"}
      data-avatar-kind="user"
      data-avatar-seed={seed}
      data-avatar-style={getGeneratedAvatarVariant("user")}
      data-testid={testId ?? "user-avatar"}
      data-user-id={userId}
      style={{ width: size, height: size }}
    >
      <RadixAvatar className="h-full w-full">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={label} /> : null}
        <AvatarFallback className="bg-transparent text-transparent">
          <GeneratedAvatar kind="user" seed={seed} label={label} size={size} />
        </AvatarFallback>
      </RadixAvatar>
      {presence ? (
        <PresenceBadge
          status={presence}
          avatarSize={size}
          testId={presenceTestId}
        />
      ) : null}
    </span>
  );
}

export function RoomAvatar({
  roomId,
  roomName,
  size = 24,
  className,
  testId,
}: {
  roomId: string;
  roomName: string;
  size?: number;
  className?: string;
  testId?: string;
}) {
  const seed = getRoomAvatarSeed(roomId);
  const label = `${roomName} avatar`;

  return (
    <span
      className={cn("inline-flex shrink-0 overflow-hidden rounded-full", className)}
      aria-label={label}
      data-avatar-image="generated"
      data-avatar-kind="room"
      data-avatar-seed={seed}
      data-avatar-style={getGeneratedAvatarVariant("room")}
      data-room-id={roomId}
      data-testid={testId ?? "room-avatar"}
      style={{ width: size, height: size }}
    >
      <GeneratedAvatar kind="room" seed={seed} label={label} size={size} />
    </span>
  );
}
