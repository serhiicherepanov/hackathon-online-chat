import type {
  Friendship,
  PresenceStatus,
  User,
} from "@prisma/client";

export type SocialUserDto = {
  id: string;
  username: string;
};

export type FriendContactDto = {
  friendshipId: string;
  peer: SocialUserDto;
  status: PresenceStatus;
  requestedAt: string;
  updatedAt: string;
};

export type FriendRequestDto = {
  friendshipId: string;
  peer: SocialUserDto;
  direction: "inbound" | "outbound";
  requestedAt: string;
};

export type BlockedUserDto = {
  peer: SocialUserDto;
  blockedAt: string;
};

export type FriendsSnapshotDto = {
  friends: FriendContactDto[];
  inboundRequests: FriendRequestDto[];
  outboundRequests: FriendRequestDto[];
  blockedUsers: BlockedUserDto[];
};

export type FriendRequestEventPayload = {
  type: "friend.request";
  requestId: string;
  peer: SocialUserDto;
};

export type FriendAcceptedEventPayload = {
  type: "friend.accepted";
  friendshipId: string;
  peer: SocialUserDto;
};

export type FriendRemovedEventPayload = {
  type: "friend.removed";
  peer: SocialUserDto;
};

export type BlockCreatedEventPayload = {
  type: "block.created";
  peer: SocialUserDto;
};

export type BlockRemovedEventPayload = {
  type: "block.removed";
  peer: SocialUserDto;
};

export type DmFrozenEventPayload = {
  type: "dm.frozen";
  conversationId: string;
  frozen: boolean;
};

type FriendshipWithUsers = Friendship & {
  userA: Pick<User, "id" | "username">;
  userB: Pick<User, "id" | "username">;
};

export function serializeSocialUser(user: Pick<User, "id" | "username">): SocialUserDto {
  return {
    id: user.id,
    username: user.username,
  };
}

export function getFriendshipPeer(
  friendship: FriendshipWithUsers,
  currentUserId: string,
): Pick<User, "id" | "username"> {
  return friendship.userAId === currentUserId ? friendship.userB : friendship.userA;
}

export function serializeFriendContact(
  friendship: FriendshipWithUsers,
  currentUserId: string,
  status: PresenceStatus,
): FriendContactDto {
  return {
    friendshipId: friendship.id,
    peer: serializeSocialUser(getFriendshipPeer(friendship, currentUserId)),
    status,
    requestedAt: friendship.createdAt.toISOString(),
    updatedAt: friendship.updatedAt.toISOString(),
  };
}

export function serializeFriendRequest(
  friendship: FriendshipWithUsers,
  currentUserId: string,
): FriendRequestDto {
  return {
    friendshipId: friendship.id,
    peer: serializeSocialUser(getFriendshipPeer(friendship, currentUserId)),
    direction: friendship.requestedById === currentUserId ? "outbound" : "inbound",
    requestedAt: friendship.createdAt.toISOString(),
  };
}

export function serializeFriendRequestEvent(
  friendshipId: string,
  peer: Pick<User, "id" | "username">,
): FriendRequestEventPayload {
  return {
    type: "friend.request",
    requestId: friendshipId,
    peer: serializeSocialUser(peer),
  };
}

export function serializeFriendAcceptedEvent(
  friendshipId: string,
  peer: Pick<User, "id" | "username">,
): FriendAcceptedEventPayload {
  return {
    type: "friend.accepted",
    friendshipId,
    peer: serializeSocialUser(peer),
  };
}

export function serializeFriendRemovedEvent(
  peer: Pick<User, "id" | "username">,
): FriendRemovedEventPayload {
  return {
    type: "friend.removed",
    peer: serializeSocialUser(peer),
  };
}

export function serializeBlockCreatedEvent(
  peer: Pick<User, "id" | "username">,
): BlockCreatedEventPayload {
  return {
    type: "block.created",
    peer: serializeSocialUser(peer),
  };
}

export function serializeBlockRemovedEvent(
  peer: Pick<User, "id" | "username">,
): BlockRemovedEventPayload {
  return {
    type: "block.removed",
    peer: serializeSocialUser(peer),
  };
}

export function serializeDmFrozenEvent(
  conversationId: string,
  frozen: boolean,
): DmFrozenEventPayload {
  return {
    type: "dm.frozen",
    conversationId,
    frozen,
  };
}
