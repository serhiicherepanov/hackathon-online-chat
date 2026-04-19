"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FriendRequestDto } from "@/lib/social/serialize";
import type { RoomInviteRow } from "@/lib/hooks/use-room-invites";

export type SidebarInvitesListProps = {
  roomInvites: RoomInviteRow[];
  friendRequests: FriendRequestDto[];
  busyRoomInviteId: string | null;
  busyFriendRequestId: string | null;
  onAcceptRoomInvite: (inviteId: string) => void;
  onDeclineRoomInvite: (inviteId: string) => void;
  onAcceptFriendRequest: (friendshipId: string) => void;
  onDeclineFriendRequest: (friendshipId: string) => void;
};

export function SidebarInvitesList({
  roomInvites,
  friendRequests,
  busyRoomInviteId,
  busyFriendRequestId,
  onAcceptRoomInvite,
  onDeclineRoomInvite,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
}: SidebarInvitesListProps) {
  const total = roomInvites.length + friendRequests.length;

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground" data-testid="sidebar-invites-empty">
        No pending invites.
      </p>
    );
  }

  return (
    <div className="space-y-2" data-testid="sidebar-invites-list">
      {roomInvites.map((invite) => (
        <div
          key={`room-${invite.id}`}
          className="rounded-md border p-2 text-sm"
          data-testid={`room-invite-${invite.id}`}
          data-invite-kind="room"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline">Room invite</Badge>
            <span className="truncate font-medium">{invite.room.name}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Invited by {invite.inviter.username}
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => onAcceptRoomInvite(invite.id)}
              disabled={busyRoomInviteId === invite.id}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeclineRoomInvite(invite.id)}
              disabled={busyRoomInviteId === invite.id}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
      {friendRequests.map((request) => (
        <div
          key={`friend-${request.friendshipId}`}
          className="rounded-md border p-2 text-sm"
          data-testid={`friend-request-${request.friendshipId}`}
          data-invite-kind="friend"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline">Friend request</Badge>
            <span className="truncate font-medium">{request.peer.username}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Wants to connect with you
          </div>
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              onClick={() => onAcceptFriendRequest(request.friendshipId)}
              disabled={busyFriendRequestId === request.friendshipId}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDeclineFriendRequest(request.friendshipId)}
              disabled={busyFriendRequestId === request.friendshipId}
            >
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
