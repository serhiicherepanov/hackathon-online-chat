import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoomAvatar, UserAvatar } from "./user-avatar";

describe("<UserAvatar />", () => {
  it("uses the shared generated fallback seed and restored face-like style for users without uploaded avatars", () => {
    render(<UserAvatar userId="user-1" username="alice" />);

    const avatar = screen.getByTestId("user-avatar");
    expect(avatar).toHaveAttribute("data-avatar-kind", "user");
    expect(avatar).toHaveAttribute("data-avatar-image", "generated");
    expect(avatar).toHaveAttribute("data-avatar-seed", "user:user-1");
    expect(avatar).toHaveAttribute("data-avatar-style", "beam");
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
    expect(avatar).toHaveAttribute("data-avatar-style", "beam");
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
  it("uses a stable room seed and abstract style for generated room avatars", () => {
    render(<RoomAvatar roomId="room-1" roomName="General" />);

    const avatar = screen.getByTestId("room-avatar");
    expect(avatar).toHaveAttribute("data-avatar-seed", "room:room-1");
    expect(avatar).toHaveAttribute("data-avatar-style", "marble");
  });
});
