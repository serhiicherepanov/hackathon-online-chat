import type { Friendship, PresenceStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  getFriendshipPeer,
  serializeDmFrozenEvent,
  serializeFriendContact,
  serializeFriendRequest,
  serializeFriendRequestEvent,
} from "./serialize";

const baseFriendship: Friendship = {
  id: "friendship-1",
  userAId: "u1",
  userBId: "u2",
  status: "accepted",
  requestedById: "u1",
  note: null,
  createdAt: new Date("2026-04-18T12:00:00.000Z"),
  updatedAt: new Date("2026-04-18T12:30:00.000Z"),
};

const friendshipWithUsers = {
  ...baseFriendship,
  userA: { id: "u1", username: "alice", avatarUrl: null },
  userB: { id: "u2", username: "bob", avatarUrl: "https://cdn.test/bob.png" },
};

describe("social serializers", () => {
  it("picks the opposite friendship peer for the current user", () => {
    expect(getFriendshipPeer(friendshipWithUsers, "u1")).toEqual({
      id: "u2",
      username: "bob",
      avatarUrl: "https://cdn.test/bob.png",
    });
  });

  it("serializes accepted friends with peer presence", () => {
    expect(
      serializeFriendContact(
        friendshipWithUsers,
        "u1",
        "afk" as PresenceStatus,
      ),
    ).toEqual({
      friendshipId: "friendship-1",
      peer: {
        id: "u2",
        username: "bob",
        avatarUrl: "https://cdn.test/bob.png",
      },
      status: "afk",
      requestedAt: "2026-04-18T12:00:00.000Z",
      updatedAt: "2026-04-18T12:30:00.000Z",
    });
  });

  it("serializes inbound versus outbound request direction from requestedById", () => {
    expect(serializeFriendRequest(friendshipWithUsers, "u1").direction).toBe("outbound");
    expect(serializeFriendRequest(friendshipWithUsers, "u2").direction).toBe("inbound");
  });

  it("serializes social realtime payloads", () => {
    expect(
      serializeFriendRequestEvent("request-1", { id: "u1", username: "alice" }),
    ).toEqual({
      type: "friend.request",
      requestId: "request-1",
      peer: { id: "u1", username: "alice" },
    });

    expect(serializeDmFrozenEvent("dm-1", true)).toEqual({
      type: "dm.frozen",
      conversationId: "dm-1",
      frozen: true,
    });
  });
});
