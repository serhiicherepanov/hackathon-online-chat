import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopyUserIdButton } from "./copy-user-id-button";

const copyToClipboard = vi.fn((_value: string) => true);

vi.mock("copy-to-clipboard", () => ({
  default: (value: string) => copyToClipboard(value),
}));

describe("<CopyUserIdButton />", () => {
  beforeEach(() => {
    copyToClipboard.mockClear();
  });

  it("shows a shortened preview while copying the full user id", async () => {
    render(<CopyUserIdButton userId="1234567890abcdef" />);

    expect(screen.getByText("#12345678")).toBeInTheDocument();
    expect(screen.queryByText("#1234567890abcdef")).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId("copy-user-id-button"));

    expect(copyToClipboard).toHaveBeenCalledWith("1234567890abcdef");
    expect(screen.getByText("Copied")).toBeInTheDocument();
  });
});
