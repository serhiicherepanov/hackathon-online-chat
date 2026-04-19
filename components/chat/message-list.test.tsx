import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageList } from "./message-list";
import type { MessageDto } from "@/lib/types/chat";
import { useMessageInteractionStore } from "@/lib/stores/message-interaction-store";

const virtuosoState = {
  scrollToIndex: vi.fn(),
  props: null as null | {
    atBottomStateChange?: (bottom: boolean) => void;
  },
};

vi.mock("react-virtuoso", async () => {
  const React = await vi.importActual<typeof import("react")>("react");

  return {
    Virtuoso: React.forwardRef(function MockVirtuoso(
      props: {
        data: MessageDto[];
        itemContent: (index: number, message: MessageDto) => React.ReactNode;
        atBottomStateChange?: (bottom: boolean) => void;
      },
      ref,
    ) {
      virtuosoState.props = {
        atBottomStateChange: props.atBottomStateChange,
      };

      React.useImperativeHandle(ref, () => ({
        scrollToIndex: virtuosoState.scrollToIndex,
      }));

      return (
        <div data-testid="virtuoso">
          {props.data.map((message, index) => (
            <div key={message.id}>{props.itemContent(index, message)}</div>
          ))}
        </div>
      );
    }),
  };
});

vi.mock("./message-item", () => ({
  MessageItem: ({ message }: { message: MessageDto }) => <div>{message.body}</div>,
}));

function buildMessage(
  id: string,
  body: string,
  conversationId = "conv-1",
): MessageDto {
  return {
    id,
    conversationId,
    authorId: "user-1",
    author: {
      id: "user-1",
      username: "alice",
      displayName: null,
      avatarUrl: null,
    },
    body,
    createdAt: new Date(2026, 0, 1).toISOString(),
    editedAt: null,
    deletedAt: null,
    deleted: false,
    replyTo: null,
    attachments: [],
    pending: false,
    error: null,
  };
}

describe("<MessageList />", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    virtuosoState.scrollToIndex.mockReset();
    virtuosoState.props = null;
    useMessageInteractionStore.setState({
      editRequestId: null,
      flashMessageId: null,
      flashNonce: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("forces a flush scroll to the bottom when pinned and new messages append", () => {
    const { rerender } = render(
      <MessageList
        conversationId="conv-1"
        messages={[buildMessage("m1", "hello"), buildMessage("m2", "world")]}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchOlder={vi.fn()}
      />,
    );

    act(() => {
      vi.runAllTimers();
      virtuosoState.props?.atBottomStateChange?.(true);
    });

    virtuosoState.scrollToIndex.mockClear();

    rerender(
      <MessageList
        conversationId="conv-1"
        messages={[
          buildMessage("m1", "hello"),
          buildMessage("m2", "world"),
          buildMessage("m3", "latest"),
        ]}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchOlder={vi.fn()}
      />,
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText("latest")).toBeInTheDocument();
    expect(virtuosoState.scrollToIndex).toHaveBeenCalledWith({
      index: "LAST",
      align: "end",
      behavior: "auto",
    });
    expect(screen.queryByTestId("new-messages-pill")).not.toBeInTheDocument();
  });

  it("clears stale new-message pill state when switching conversations", () => {
    const { rerender } = render(
      <MessageList
        conversationId="conv-1"
        messages={[buildMessage("m1", "hello"), buildMessage("m2", "world")]}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchOlder={vi.fn()}
      />,
    );

    act(() => {
      vi.runAllTimers();
      virtuosoState.props?.atBottomStateChange?.(false);
    });

    rerender(
      <MessageList
        conversationId="conv-1"
        messages={[
          buildMessage("m1", "hello"),
          buildMessage("m2", "world"),
          buildMessage("m3", "latest"),
        ]}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchOlder={vi.fn()}
      />,
    );

    expect(screen.getByTestId("new-messages-pill")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("new-messages-pill"));

    expect(screen.queryByTestId("new-messages-pill")).not.toBeInTheDocument();

    rerender(
      <MessageList
        conversationId="conv-2"
        messages={[buildMessage("n1", "other room", "conv-2")]}
        hasNextPage={false}
        isFetchingNextPage={false}
        fetchOlder={vi.fn()}
      />,
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText("other room")).toBeInTheDocument();
    expect(screen.queryByTestId("new-messages-pill")).not.toBeInTheDocument();
  });
});
