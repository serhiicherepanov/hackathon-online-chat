import type {
  Friendship,
  PresenceStatus,
} from "@prisma/client";

export type SocialUserDto = {
  id: string;
  username: string;
};

export type SocialAvatarUserDto = SocialUserDto & {
  avatarUrl: string | null;
};

export type FriendContactDto = {
  friendshipId: string;
  peer: SocialAvatarUserDto;
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

type SocialUserLike = {
  id: string;
  username: string;
};

type SocialAvatarUserLike = SocialUserLike & {
  avatarUrl?: string | null;
};

type FriendshipWithUsers = Friendship & {
  userA: SocialAvatarUserLike;
  userB: SocialAvatarUserLike;
};

export function serializeSocialUser(user: SocialUserLike): SocialUserDto {
  return {
    id: user.id,
    username: user.username,
  };
}

export function serializeAvatarSocialUser(user: SocialAvatarUserLike): SocialAvatarUserDto {
  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl ?? null,
  };
}

export function getFriendshipPeer(
  friendship: FriendshipWithUsers,
  currentUserId: string,
): SocialAvatarUserLike {
  return friendship.userAId === currentUserId ? friendship.userB : friendship.userA;
}

export function serializeFriendContact(
  friendship: FriendshipWithUsers,
  currentUserId: string,
  status: PresenceStatus,
): FriendContactDto {
  return {
    friendshipId: friendship.id,
    peer: serializeAvatarSocialUser(getFriendshipPeer(friendship, currentUserId)),
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
  peer: SocialUserLike,
): FriendRequestEventPayload {
  return {
    type: "friend.request",
    requestId: friendshipId,
    peer: serializeSocialUser(peer),
  };
}

export function serializeFriendAcceptedEvent(
  friendshipId: string,
  peer: SocialUserLike,
): FriendAcceptedEventPayload {
  return {
    type: "friend.accepted",
    friendshipId,
    peer: serializeSocialUser(peer),
  };
}

export function serializeFriendRemovedEvent(
  peer: SocialUserLike,
): FriendRemovedEventPayload {
  return {
    type: "friend.removed",
    peer: serializeSocialUser(peer),
  };
}

export function serializeBlockCreatedEvent(
  peer: SocialUserLike,
): BlockCreatedEventPayload {
  return {
    type: "block.created",
    peer: serializeSocialUser(peer),
  };
}

export function serializeBlockRemovedEvent(
  peer: SocialUserLike,
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
