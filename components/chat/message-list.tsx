"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageItem } from "@/components/chat/message-item";
import { reportError } from "@/lib/report-error";
import { useMessageInteractionStore } from "@/lib/stores/message-interaction-store";
import type { MessageDto } from "@/lib/types/chat";

type MessageListProps = {
  conversationId: string;
  messages: MessageDto[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchOlder: () => void;
};

export function MessageList({
  conversationId,
  messages,
  hasNextPage,
  isFetchingNextPage,
  fetchOlder,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const didSnapToBottomRef = useRef(false);
  const atBottomRef = useRef(true);
  const previousConversationIdRef = useRef(conversationId);
  const previousLengthRef = useRef(messages.length);
  const previousLastMessageIdRef = useRef(messages.at(-1)?.id ?? null);
  const [atBottom, setAtBottom] = useState(true);
  const [newWhileAwayConversationId, setNewWhileAwayConversationId] = useState<
    string | null
  >(null);

  useEffect(() => {
    didSnapToBottomRef.current = false;
    atBottomRef.current = true;
    previousConversationIdRef.current = conversationId;
    previousLengthRef.current = messages.length;
    previousLastMessageIdRef.current = messages.at(-1)?.id ?? null;
    setNewWhileAwayConversationId(null);
    setAtBottom(true);
  }, [conversationId]);

  const scheduleSnapToBottom = useCallback((behavior: "auto" | "smooth") => {
    let cancelled = false;

    const snap = () => {
      if (cancelled) return;
      virtuosoRef.current?.scrollToIndex({
        index: "LAST",
        align: "end",
        behavior,
      });
    };

    snap();
    const raf = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(snap);
    });
    const timeout = window.setTimeout(snap, 50);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0 || didSnapToBottomRef.current) return;
    didSnapToBottomRef.current = true;
    const cancel = scheduleSnapToBottom("auto");
    return cancel;
  }, [conversationId, messages.length, scheduleSnapToBottom]);

  useEffect(() => {
    const lastMessageId = messages.at(-1)?.id ?? null;
    const sameConversation = previousConversationIdRef.current === conversationId;
    const appendedNewestMessage =
      sameConversation &&
      messages.length > previousLengthRef.current &&
      lastMessageId !== previousLastMessageIdRef.current;

    let cleanup: () => void = () => {};

    if (appendedNewestMessage) {
      if (atBottomRef.current) {
        cleanup = scheduleSnapToBottom("auto");
      } else {
        setNewWhileAwayConversationId(conversationId);
      }
    }

    previousConversationIdRef.current = conversationId;
    previousLengthRef.current = messages.length;
    previousLastMessageIdRef.current = lastMessageId;

    return cleanup;
  }, [conversationId, messages, scheduleSnapToBottom]);

  const items = useMemo(() => messages, [messages]);

  const flashMessage = useMessageInteractionStore((s) => s.flashMessage);

  const scrollToReply = useCallback(
    async (id: string) => {
      const idx = items.findIndex((m) => m.id === id);
      if (idx >= 0) {
        virtuosoRef.current?.scrollToIndex({ index: idx, align: "center" });
        window.setTimeout(() => flashMessage(id), 120);
        return;
      }
      if (hasNextPage && !isFetchingNextPage) {
        fetchOlder();
      }
    },
    [fetchOlder, flashMessage, hasNextPage, isFetchingNextPage, items],
  );

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      data-testid="message-list-root"
    >
      {items.length === 0 ? (
        <div className="flex h-full items-center justify-center p-6">
          <div className="rounded-xl border border-dashed px-6 py-8 text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation.
          </div>
        </div>
      ) : null}
      <div className="h-full min-h-0" data-testid="message-scroller">
        <Virtuoso
          className="h-full min-h-0"
          ref={virtuosoRef}
          data={items}
        style={items.length === 0 ? { display: "none" } : undefined}
        initialTopMostItemIndex={Math.max(0, items.length - 1)}
        followOutput={atBottom ? "auto" : false}
        atBottomStateChange={(bottom) => {
          atBottomRef.current = bottom;
          setAtBottom(bottom);
          if (bottom) setNewWhileAwayConversationId(null);
        }}
        startReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchOlder();
        }}
        itemContent={(_index, m) => (
          <ErrorBoundary
            onError={(err) =>
              reportError(err, { area: "message-item", id: m.id })
            }
            fallbackRender={({ resetErrorBoundary }) => (
              <div className="px-4 py-2 text-xs text-muted-foreground">
                Could not render message.{" "}
                <button
                  type="button"
                  className="underline"
                  onClick={resetErrorBoundary}
                >
                  Retry
                </button>
              </div>
            )}
          >
            <MessageItem message={m} onScrollToReply={scrollToReply} />
          </ErrorBoundary>
        )}
        />
      </div>

      {newWhileAwayConversationId === conversationId ? (
        <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center">
          <Button
            type="button"
            size="sm"
            data-testid="new-messages-pill"
            className={cn("pointer-events-auto shadow")}
            onClick={() => {
              virtuosoRef.current?.scrollToIndex({
                index: "LAST",
                align: "end",
                behavior: "smooth",
              });
              setNewWhileAwayConversationId(null);
            }}
          >
            New messages
          </Button>
        </div>
      ) : null}
    </div>
  );
}
