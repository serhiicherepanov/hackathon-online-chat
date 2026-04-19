import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  TOMBSTONE_DISPLAY_NAME,
  buildDeletedAccountIdentity,
  planAccountDeletion,
} from "./deletion";

describe("account deletion helpers", () => {
  it("builds anonymized credentials with a tombstone display name", () => {
    expect(buildDeletedAccountIdentity("user_123-abc")).toEqual({
      email: "deleted+user123abc@example.invalid",
      username: "deleted_user123abc",
      displayName: TOMBSTONE_DISPLAY_NAME,
    });
  });

  it("plans the ownership, membership, and tombstone work", async () => {
    const roomMemberFindMany = vi
      .fn()
      .mockResolvedValueOnce([
        {
          roomId: "room-owned",
          room: { conversationId: "conv-owned" },
        },
      ])
      .mockResolvedValueOnce([
        {
          roomId: "room-owned",
          role: "owner",
          room: { conversationId: "conv-owned" },
        },
        {
          roomId: "room-member",
          role: "member",
          room: { conversationId: "conv-member" },
        },
      ]);
    const dmParticipantFindMany = vi.fn().mockResolvedValue([
      { conversationId: "conv-dm-1" },
      { conversationId: "conv-dm-2" },
    ]);
    const sessionCount = vi.fn().mockResolvedValue(3);
    const messageCount = vi.fn().mockResolvedValue(9);

    const db = {
      roomMember: {
        findMany: roomMemberFindMany,
      },
      dmParticipant: {
        findMany: dmParticipantFindMany,
      },
      session: {
        count: sessionCount,
      },
      message: {
        count: messageCount,
      },
    } as unknown as PrismaClient;

    await expect(planAccountDeletion(db, "user-1")).resolves.toMatchObject({
      userId: "user-1",
      ownedRoomIds: ["room-owned"],
      ownedConversationIds: ["conv-owned"],
      survivingConversationIds: ["conv-member", "conv-dm-1", "conv-dm-2"],
      ownedRoomCount: 1,
      survivingRoomMembershipCount: 1,
      dmConversationCount: 2,
      activeSessionCount: 3,
      tombstoneMessageCount: 9,
      tombstoneIdentity: {
        displayName: TOMBSTONE_DISPLAY_NAME,
      },
    });
  });
});
