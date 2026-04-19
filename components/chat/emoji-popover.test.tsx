import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmojiPopover } from "./emoji-popover";

describe("EmojiPopover", () => {
  it("mounts the picker and forwards emoji-click selections", async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    const loadPickerModule = vi.fn(async () => ({
      Picker: class MockPicker extends HTMLElement {},
    }));

    if (!customElements.get("emoji-picker")) {
      customElements.define("emoji-picker", class extends HTMLElement {});
    }

    render(
      <EmojiPopover
        onPick={onPick}
        loadPickerModule={loadPickerModule as never}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Insert emoji" }));

    await waitFor(() => {
      expect(screen.getByTestId("emoji-picker")).toBeInTheDocument();
    });

    await waitFor(() => {
      screen.getByTestId("emoji-picker").dispatchEvent(
        new CustomEvent("emoji-click", {
          detail: { unicode: "😀" },
          bubbles: true,
        }),
      );

      expect(onPick).toHaveBeenCalledWith("😀");
    });

    expect(loadPickerModule).toHaveBeenCalled();
  });
});
