import type { MessageDto } from "@/lib/types/chat";

export type CachedMessagePages = {
  pages: { messages: MessageDto[] }[];
};

export function findLatestEditableMessageId(
  cache: CachedMessagePages | undefined,
  selfUserId: string | null,
): string | null {
  if (!selfUserId) return null;
  const pages = cache?.pages ?? [];
  for (const page of pages) {
    for (const message of page.messages) {
      if (message.deleted) continue;
      if (message.authorId !== selfUserId) continue;
      return message.id;
    }
  }
  return null;
}
