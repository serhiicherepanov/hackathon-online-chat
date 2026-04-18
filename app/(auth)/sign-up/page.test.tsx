import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

import SignUpPage from "./page";

describe("<SignUpPage />", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    push.mockReset();
    refresh.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows validation details returned by the register API", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: vi.fn().mockResolvedValue({
        error: "validation_error",
        details: {
          formErrors: [],
          fieldErrors: {
            username: ["Username must be at least 2 characters."],
          },
        },
      }),
    });

    render(<SignUpPage />);

    await userEvent.type(screen.getByLabelText("Email"), "alice@example.com");
    await userEvent.type(screen.getByLabelText("Username"), "a");
    await userEvent.type(screen.getByLabelText("Password"), "supersecret");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(
      await screen.findByText("Username must be at least 2 characters."),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
