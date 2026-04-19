import { describe, expect, it } from "vitest";
import { decodeMessageCursor, encodeMessageCursor } from "./history-cursor";

describe("message history cursor helpers", () => {
  it("round-trips the createdAt and id pair", () => {
    const cursor = encodeMessageCursor({
      createdAt: new Date("2026-04-19T12:00:00.000Z"),
      id: "msg_123",
    });

    expect(decodeMessageCursor(cursor)).toEqual({
      createdAt: new Date("2026-04-19T12:00:00.000Z"),
      id: "msg_123",
    });
  });

  it("returns null for malformed cursors", () => {
    expect(decodeMessageCursor("not-base64")).toBeNull();
    expect(
      decodeMessageCursor(
        Buffer.from(JSON.stringify({ createdAt: "nope", id: 123 })).toString(
          "base64url",
        ),
      ),
    ).toBeNull();
  });
});
