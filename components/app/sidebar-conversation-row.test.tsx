import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  SidebarDmRow,
  SidebarRoomRow,
} from "@/components/app/sidebar-conversation-row";

describe("sidebar avatar rows", () => {
  it("keeps DM rows on the user avatar style and room rows on the room avatar style", () => {
    render(
      <>
        <SidebarDmRow
          conversationId="dm-1"
          peer={{ id: "user-1", username: "alice" }}
          unread={2}
          active={false}
          presence="online"
        />
        <SidebarRoomRow
          room={{ id: "room-1", name: "General", conversationId: "conv-1" }}
          unread={3}
          active={false}
        />
      </>,
    );

    expect(screen.getByTestId("sidebar-dm-avatar-user-1")).toHaveAttribute(
      "data-avatar-style",
      "beam",
    );
    expect(screen.getByTestId("sidebar-room-avatar-room-1")).toHaveAttribute(
      "data-avatar-style",
      "marble",
    );
  });
});
