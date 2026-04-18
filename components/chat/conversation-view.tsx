"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MessageComposer } from "@/components/chat/message-composer";
import { MessageList } from "@/components/chat/message-list";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import { useCentrifugeContext } from "@/components/providers/centrifuge-provider";
import { useLiveMessages } from "@/lib/hooks/use-live-messages";
import { useLiveTyping } from "@/lib/hooks/use-live-typing";
import { useMessageHistory } from "@/lib/hooks/use-message-history";
import { useActiveConversationStore } from "@/lib/stores/active-conversation-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { reportError } from "@/lib/report-error";
import type { MessageDto } from "@/lib/types/chat";

export function ConversationView({
  conversationId,
  channel,
  title,
  headerExtra,
  banner,
  aside,
  composerDisabled = false,
  composerDisabledReason,
}: {
  conversationId: string;
  channel: string;
  title: string;
  headerExtra?: React.ReactNode;
  banner?: React.ReactNode;
  aside?: React.ReactNode;
  composerDisabled?: boolean;
  composerDisabledReason?: string;
}) {
  const { client } = useCentrifugeContext();
  const setActive = useActiveConversationStore((s) => s.setConversationId);
  const queryClient = useQueryClient();
  const selfUserId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    setActive(conversationId);
    return () => setActive(null);
  }, [conversationId, setActive]);

  useLiveMessages(client, conversationId, channel);
  useLiveTyping(client, conversationId, channel, selfUserId);

  const history = useMessageHistory(conversationId);

  const chronological = useMemo(() => {
    const desc = history.data?.pages.flatMap((p) => p.messages) ?? [];
    const normalized: MessageDto[] = desc.map((m) => ({
      ...m,
      createdAt:
        typeof m.createdAt === "string"
          ? m.createdAt
          : new Date(m.createdAt as unknown as Date).toISOString(),
    }));
    return [...normalized].reverse();
  }, [history.data?.pages]);

  useEffect(() => {
    function markRead() {
      void fetch(`/api/conversations/${conversationId}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch(() => undefined);
    }

    const onVis = () => {
      if (document.visibilityState === "visible") markRead();
    };

    markRead();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [conversationId]);

  return (
    <div className="flex h-full min-h-0 flex-1">
      <div className="flex min-w-0 min-h-0 flex-1 flex-col border-r border-border">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h1 className="text-lg font-semibold">{title}</h1>
          {headerExtra}
        </div>

        {banner}

        <ErrorBoundary
          onError={(err) => reportError(err, { area: "message-list" })}
          fallbackRender={({ error, resetErrorBoundary }) => (
            <div className="m-4 rounded-md border border-border bg-card p-4 text-sm">
              <p className="font-medium">Could not render messages.</p>
              <p className="mt-2 text-muted-foreground">{String(error)}</p>
              <Button
                className="mt-4"
                type="button"
                variant="secondary"
                onClick={() => {
                  resetErrorBoundary();
                  void queryClient.invalidateQueries({
                    queryKey: ["conv", conversationId, "messages"],
                  });
                }}
              >
                Retry
              </Button>
            </div>
          )}
        >
          <MessageList
            conversationId={conversationId}
            messages={chronological}
            hasNextPage={Boolean(history.hasNextPage)}
            isFetchingNextPage={history.isFetchingNextPage}
            fetchOlder={() => void history.fetchNextPage()}
          />
        </ErrorBoundary>

        <TypingIndicator conversationId={conversationId} />

        <MessageComposer
          conversationId={conversationId}
          disabled={composerDisabled}
          disabledReason={composerDisabledReason}
        />
      </div>

      {aside ? (
        <aside className="hidden w-72 shrink-0 flex-col gap-3 p-4 md:flex">
          {aside}
        </aside>
      ) : null}
    </div>
  );
}
