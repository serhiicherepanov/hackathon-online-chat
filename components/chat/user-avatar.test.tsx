import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoomAvatar, UserAvatar } from "./user-avatar";

describe("<UserAvatar />", () => {
  it("uses the shared generated fallback seed for users without uploaded avatars", () => {
    render(<UserAvatar userId="user-1" username="alice" />);

    const avatar = screen.getByTestId("user-avatar");
    expect(avatar).toHaveAttribute("data-avatar-kind", "user");
    expect(avatar).toHaveAttribute("data-avatar-image", "generated");
    expect(avatar).toHaveAttribute("data-avatar-seed", "user:user-1");
  });

  it("preserves uploaded avatar images when one is available", () => {
    render(
      <UserAvatar
        userId="user-2"
        username="bob"
        avatarUrl="https://cdn.test/bob.png"
      />,
    );

    const avatar = screen.getByTestId("user-avatar");
    expect(avatar).toHaveAttribute("data-avatar-image", "uploaded");
    expect(avatar).toHaveAttribute("aria-label", "bob avatar");
    expect(avatar).toHaveAttribute("data-avatar-seed", "user:user-2");
  });

  it("anchors presence as a badge on the avatar container", () => {
    render(
      <UserAvatar
        userId="user-3"
        username="carol"
        presence="afk"
        presenceTestId="presence-badge"
      />,
    );

    const badge = screen.getByTestId("presence-badge");
    expect(badge).toHaveAttribute("data-presence", "afk");
    expect(badge.className).toMatch(/absolute/);
    expect(badge.className).toMatch(/bottom-0/);
    expect(badge.className).toMatch(/right-0/);
  });
});

describe("<RoomAvatar />", () => {
  it("uses a stable room seed for generated room avatars", () => {
    render(<RoomAvatar roomId="room-1" roomName="General" />);

    expect(screen.getByTestId("room-avatar")).toHaveAttribute(
      "data-avatar-seed",
      "room:room-1",
    );
  });
});
