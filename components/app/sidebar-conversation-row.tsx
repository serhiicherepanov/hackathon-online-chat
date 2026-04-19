"use client";

import Link from "next/link";
import { RoomAvatar, UserAvatar } from "@/components/chat/user-avatar";
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
}) {
  return (
    <Link
      href={`/dm/${conversationId}`}
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
}: {
  room: {
    id: string;
    name: string;
    conversationId: string;
  };
  unread: number;
  active: boolean;
}) {
  return (
    <Link
      href={`/rooms/${room.id}`}
      data-testid={`sidebar-room-row-${room.id}`}
      className={cn(
        "flex h-9 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent",
        active && "bg-accent",
      )}
    >
      <RoomAvatar
        roomId={room.id}
        roomName={room.name}
        size={24}
        testId={`sidebar-room-avatar-${room.id}`}
      />
      <span className="min-w-0 flex-1 truncate">{room.name}</span>
      <UnreadBadge count={unread} />
    </Link>
  );
}
