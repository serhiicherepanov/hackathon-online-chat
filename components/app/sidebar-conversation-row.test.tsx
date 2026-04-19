import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  SidebarDmRow,
  SidebarRoomRow,
} from "@/components/app/sidebar-conversation-row";

describe("sidebar avatar rows", () => {
  it("uses the user avatar style for DM rows", () => {
    render(
      <SidebarDmRow
        conversationId="dm-1"
        peer={{ id: "user-1", username: "alice" }}
        unread={2}
        active={false}
        presence="online"
      />,
    );

    expect(screen.getByTestId("sidebar-dm-avatar-user-1")).toHaveAttribute(
      "data-avatar-style",
      "beam",
    );
  });

  it("uses a public-room icon for public room rows", () => {
    render(
      <SidebarRoomRow
        room={{
          id: "room-1",
          name: "General",
          conversationId: "conv-1",
          visibility: "public",
        }}
        unread={3}
        active={false}
      />,
    );

    const icon = screen.getByTestId("sidebar-room-icon-room-1");
    expect(icon).toHaveAttribute("data-room-visibility", "public");
  });

  it("uses a lock icon for private room rows", () => {
    render(
      <SidebarRoomRow
        room={{
          id: "room-2",
          name: "Secret",
          conversationId: "conv-2",
          visibility: "private",
        }}
        unread={0}
        active={false}
      />,
    );

    const icon = screen.getByTestId("sidebar-room-icon-room-2");
    expect(icon).toHaveAttribute("data-room-visibility", "private");
  });
});
