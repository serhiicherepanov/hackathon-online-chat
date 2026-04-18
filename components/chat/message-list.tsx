"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
  const [atBottom, setAtBottom] = useState(true);
  const [newWhileAway, setNewWhileAway] = useState(false);
  const lastSeenLenRef = useRef(messages.length);

  useEffect(() => {
    if (messages.length > lastSeenLenRef.current && !atBottom) {
      setNewWhileAway(true);
    }
    lastSeenLenRef.current = messages.length;
  }, [atBottom, messages.length]);

  useEffect(() => {
    didSnapToBottomRef.current = false;
    lastSeenLenRef.current = 0;
    setNewWhileAway(false);
    setAtBottom(true);
  }, [conversationId]);

  useEffect(() => {
    if (messages.length === 0 || didSnapToBottomRef.current) return;
    didSnapToBottomRef.current = true;
    let cancelled = false;
    const snap = () => {
      if (cancelled) return;
      virtuosoRef.current?.scrollToIndex({
        index: "LAST",
        align: "end",
        behavior: "auto",
      });
    };
    snap();
    const t1 = window.setTimeout(snap, 50);
    const t2 = window.setTimeout(snap, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [conversationId, messages.length]);

  const items = useMemo(() => messages, [messages]);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      data-testid="message-list-root"
    >
      <div className="h-full min-h-0" data-testid="message-scroller">
        <Virtuoso
          className="h-full min-h-0"
          ref={virtuosoRef}
          data={items}
        initialTopMostItemIndex={Math.max(0, items.length - 1)}
        followOutput={atBottom ? "smooth" : false}
        atBottomStateChange={(bottom) => {
          setAtBottom(bottom);
          if (bottom) setNewWhileAway(false);
        }}
        startReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchOlder();
        }}
        itemContent={(_index, m) => (
          <div className="px-4 py-2">
            <div className="text-xs text-muted-foreground">
              {m.author.username}{" "}
              <span className="text-[10px]">
                {new Date(m.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="text-sm">{m.body}</div>
          </div>
        )}
        />
      </div>

      {newWhileAway ? (
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
              setNewWhileAway(false);
            }}
          >
            New messages
          </Button>
        </div>
      ) : null}
    </div>
  );
}
