type MessageCursorParts = {
  createdAt: Date | string;
  id: string;
};

type DecodedMessageCursor = {
  createdAt: Date;
  id: string;
};

export function encodeMessageCursor(parts: MessageCursorParts): string {
  const createdAt =
    parts.createdAt instanceof Date
      ? parts.createdAt.toISOString()
      : new Date(parts.createdAt).toISOString();

  return Buffer.from(
    JSON.stringify({
      createdAt,
      id: parts.id,
    }),
  ).toString("base64url");
}

export function decodeMessageCursor(input: string): DecodedMessageCursor | null {
  try {
    const decoded = JSON.parse(Buffer.from(input, "base64url").toString("utf8")) as {
      createdAt?: unknown;
      id?: unknown;
    };

    if (typeof decoded.createdAt !== "string" || typeof decoded.id !== "string") {
      return null;
    }

    const createdAt = new Date(decoded.createdAt);
    if (Number.isNaN(createdAt.getTime())) {
      return null;
    }

    return {
      createdAt,
      id: decoded.id,
    };
  } catch {
    return null;
  }
}
