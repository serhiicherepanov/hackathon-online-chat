import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageComposer, insertTextAtRange } from "./message-composer";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useComposerStore } from "@/lib/stores/composer-store";
import { useMessageInteractionStore } from "@/lib/stores/message-interaction-store";

vi.mock("./emoji-popover", () => ({
  EmojiPopover: ({ onPick }: { onPick: (emoji: string) => void }) => (
    <button type="button" onClick={() => onPick("😀")}>
      Insert emoji
    </button>
  ),
}));

describe("insertTextAtRange", () => {
  it("inserts text at the provided caret range", () => {
    expect(insertTextAtRange("hello there", "😀", 5, 5)).toEqual({
      value: "hello😀 there",
      caret: 7,
    });
  });
});

describe("MessageComposer emoji insertion", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
    useComposerStore.setState({ byConv: {} });
    useMessageInteractionStore.setState({
      editRequestId: null,
      flashMessageId: null,
      flashNonce: 0,
    });
  });

  it("updates the draft text when an emoji is picked", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MessageComposer conversationId="conv-1" />
      </QueryClientProvider>,
    );

    const input = screen.getByTestId("composer-input") as HTMLTextAreaElement;
    await user.type(input, "hello there");

    input.setSelectionRange(5, 5);
    fireEvent.select(input);

    await user.click(screen.getByRole("button", { name: "Insert emoji" }));

    expect(screen.getByTestId("composer-input")).toHaveValue("hello😀 there");
  });
});
