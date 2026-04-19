import { useInfiniteQuery } from "@tanstack/react-query";
import type { MessageDto } from "@/lib/types/chat";

type Page = { messages: MessageDto[]; nextCursor: string | null };

export function useMessageHistory(conversationId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ["conv", conversationId, "messages"],
    enabled: Boolean(conversationId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const url = new URL(
        `/api/conversations/${conversationId}/messages`,
        window.location.origin,
      );
      url.searchParams.set("limit", "50");
      if (pageParam) url.searchParams.set("before", pageParam);
      const res = await fetch(url.toString(), { signal });
      if (!res.ok) throw new Error("messages_failed");
      return (await res.json()) as Page;
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
