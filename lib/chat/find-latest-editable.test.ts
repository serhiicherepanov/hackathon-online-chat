import { describe, expect, it } from "vitest";
import { findLatestEditableMessageId } from "./find-latest-editable";
import type { MessageDto } from "@/lib/types/chat";

function msg(overrides: Partial<MessageDto>): MessageDto {
  const base: MessageDto = {
    id: "m",
    conversationId: "c",
    authorId: "u",
    author: { id: "u", username: "u", displayName: null },
    body: "hi",
    createdAt: new Date().toISOString(),
    editedAt: null,
    deletedAt: null,
    deleted: false,
    replyTo: null,
    attachments: [],
  };
  return { ...base, ...overrides };
}

describe("findLatestEditableMessageId", () => {
  it("returns null without a viewer", () => {
    expect(findLatestEditableMessageId(undefined, null)).toBeNull();
  });

  it("returns null when no messages match the viewer", () => {
    const cache = {
      pages: [{ messages: [msg({ id: "m1", authorId: "other" })] }],
    };
    expect(findLatestEditableMessageId(cache, "me")).toBeNull();
  });

  it("prefers the first authored-by-viewer message in the newest page", () => {
    const cache = {
      pages: [
        {
          messages: [
            msg({ id: "m3", authorId: "other" }),
            msg({ id: "m2", authorId: "me" }),
            msg({ id: "m1", authorId: "me" }),
          ],
        },
        { messages: [msg({ id: "m0", authorId: "me" })] },
      ],
    };
    expect(findLatestEditableMessageId(cache, "me")).toBe("m2");
  });

  it("skips deleted messages by the viewer", () => {
    const cache = {
      pages: [
        {
          messages: [
            msg({ id: "m2", authorId: "me", deleted: true }),
            msg({ id: "m1", authorId: "me" }),
          ],
        },
      ],
    };
    expect(findLatestEditableMessageId(cache, "me")).toBe("m1");
  });
});
