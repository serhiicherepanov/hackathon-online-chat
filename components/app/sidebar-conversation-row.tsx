"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/chat/user-avatar";
import { RoomVisibilityIcon } from "@/components/chat/room-visibility-icon";
import { UnreadBadge } from "@/components/app/unread-badge";
import { PRESENCE_LABEL } from "@/lib/avatar";
import type { PresenceStatus } from "@/lib/realtime/payloads";
import { cn } from "@/lib/utils";

export function SidebarDmRow({
  conversationId,
  peer,
  unread,
  active,
  presence,
  onClick,
}: {
  conversationId: string;
  peer: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
  unread: number;
  active: boolean;
  presence: PresenceStatus;
  onClick?: () => void;
}) {
  return (
    <Link
      href={`/dm/${conversationId}`}
      onClick={onClick}
      data-testid={`sidebar-dm-row-${peer.id}`}
      data-presence={presence}
      title={PRESENCE_LABEL[presence]}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent",
        active && "bg-accent",
      )}
    >
      <UserAvatar
        userId={peer.id}
        username={peer.username}
        avatarUrl={peer.avatarUrl}
        size={24}
        testId={`sidebar-dm-avatar-${peer.id}`}
        presence={presence}
        presenceTestId={`sidebar-dm-presence-${peer.id}`}
      />
      <span className="min-w-0 flex-1 truncate">{peer.username}</span>
      <UnreadBadge count={unread} />
    </Link>
  );
}

export function SidebarRoomRow({
  room,
  unread,
  active,
  onClick,
}: {
  room: {
    id: string;
    name: string;
    conversationId: string;
    visibility: "public" | "private";
  };
  unread: number;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={`/rooms/${room.id}`}
      onClick={onClick}
      data-testid={`sidebar-room-row-${room.id}`}
      data-room-visibility={room.visibility}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent",
        active && "bg-accent",
      )}
    >
      <RoomVisibilityIcon
        visibility={room.visibility}
        roomName={room.name}
        size={24}
        testId={`sidebar-room-icon-${room.id}`}
      />
      <span className="min-w-0 flex-1 truncate">{room.name}</span>
      <UnreadBadge count={unread} />
    </Link>
  );
}
