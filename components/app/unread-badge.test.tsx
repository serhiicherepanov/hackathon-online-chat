import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { UnreadBadge } from "./unread-badge";

describe("<UnreadBadge />", () => {
  it("reserves the same footprint whether unread is zero, single, or multi-digit", () => {
    const { container: zero } = render(<UnreadBadge count={0} />);
    const { container: one } = render(<UnreadBadge count={3} />);
    const { container: many } = render(<UnreadBadge count={42} />);

    const zeroBadge = zero.querySelector('[data-testid="unread-badge"]')!;
    const oneBadge = one.querySelector('[data-testid="unread-badge"]')!;
    const manyBadge = many.querySelector('[data-testid="unread-badge"]')!;

    expect(zeroBadge).toHaveAttribute("data-unread", "false");
    expect(oneBadge).toHaveAttribute("data-unread", "true");
    expect(manyBadge).toHaveAttribute("data-unread", "true");

    // layout-reserved badge keeps height + minimum width across states
    for (const el of [zeroBadge, oneBadge, manyBadge]) {
      expect(el.className).toMatch(/h-5/);
      expect(el.className).toMatch(/min-w-\[1\.25rem\]/);
    }
  });

  it("uses the primary accent surface when unread > 0", () => {
    const { container } = render(<UnreadBadge count={2} />);
    const el = container.querySelector('[data-testid="unread-badge"]')!;
    expect(el.className).toMatch(/bg-primary/);
    expect(el.className).toMatch(/text-primary-foreground/);
    expect(el).not.toHaveClass("invisible");
  });

  it("is invisibly reserved when unread is zero", () => {
    const { container } = render(<UnreadBadge count={0} />);
    const el = container.querySelector('[data-testid="unread-badge"]')!;
    expect(el.className).toMatch(/invisible/);
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("collapses large counts to 99+", () => {
    const { container } = render(<UnreadBadge count={250} />);
    const el = container.querySelector('[data-testid="unread-badge"]')!;
    expect(el.textContent).toBe("99+");
  });
});
