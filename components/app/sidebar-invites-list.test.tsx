import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SidebarInvitesList } from "./sidebar-invites-list";
import type { RoomInviteRow } from "@/lib/hooks/use-room-invites";
import type { FriendRequestDto } from "@/lib/social/serialize";

const roomInvite: RoomInviteRow = {
  id: "invite-1",
  status: "pending",
  createdAt: new Date(2026, 0, 1).toISOString(),
  respondedAt: null,
  room: {
    id: "room-1",
    conversationId: "conv-1",
    name: "Secret Lab",
    description: null,
    visibility: "private",
  },
  inviter: { id: "user-2", username: "bob" },
  invitee: { id: "user-1", username: "alice" },
};

const friendRequest: FriendRequestDto = {
  friendshipId: "fr-1",
  peer: { id: "user-3", username: "carol" },
  direction: "inbound",
  requestedAt: new Date(2026, 0, 2).toISOString(),
};

function noop() {}

describe("<SidebarInvitesList />", () => {
  it("renders empty state when there are no invites", () => {
    render(
      <SidebarInvitesList
        roomInvites={[]}
        friendRequests={[]}
        busyRoomInviteId={null}
        busyFriendRequestId={null}
        onAcceptRoomInvite={noop}
        onDeclineRoomInvite={noop}
        onAcceptFriendRequest={noop}
        onDeclineFriendRequest={noop}
      />,
    );

    expect(screen.getByTestId("sidebar-invites-empty")).toBeInTheDocument();
  });

  it("renders room invites and friend requests with distinct kind labels", () => {
    render(
      <SidebarInvitesList
        roomInvites={[roomInvite]}
        friendRequests={[friendRequest]}
        busyRoomInviteId={null}
        busyFriendRequestId={null}
        onAcceptRoomInvite={noop}
        onDeclineRoomInvite={noop}
        onAcceptFriendRequest={noop}
        onDeclineFriendRequest={noop}
      />,
    );

    const roomRow = screen.getByTestId("room-invite-invite-1");
    const friendRow = screen.getByTestId("friend-request-fr-1");
    expect(roomRow).toHaveAttribute("data-invite-kind", "room");
    expect(friendRow).toHaveAttribute("data-invite-kind", "friend");
    expect(roomRow).toHaveTextContent("Room invite");
    expect(roomRow).toHaveTextContent("Secret Lab");
    expect(friendRow).toHaveTextContent("Friend request");
    expect(friendRow).toHaveTextContent("carol");
  });

  it("invokes the correct callback per invite kind", () => {
    const onAcceptRoomInvite = vi.fn();
    const onAcceptFriendRequest = vi.fn();

    render(
      <SidebarInvitesList
        roomInvites={[roomInvite]}
        friendRequests={[friendRequest]}
        busyRoomInviteId={null}
        busyFriendRequestId={null}
        onAcceptRoomInvite={onAcceptRoomInvite}
        onDeclineRoomInvite={noop}
        onAcceptFriendRequest={onAcceptFriendRequest}
        onDeclineFriendRequest={noop}
      />,
    );

    const roomAccept = screen
      .getByTestId("room-invite-invite-1")
      .querySelector("button");
    const friendAccept = screen
      .getByTestId("friend-request-fr-1")
      .querySelector("button");

    fireEvent.click(roomAccept!);
    fireEvent.click(friendAccept!);

    expect(onAcceptRoomInvite).toHaveBeenCalledWith("invite-1");
    expect(onAcceptFriendRequest).toHaveBeenCalledWith("fr-1");
  });
});
