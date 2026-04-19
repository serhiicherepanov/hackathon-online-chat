import type { AnchorHTMLAttributes } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  useRouter: () => ({ push: vi.fn() }),
}));

import RoomsCatalogPage from "./page";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("<RoomsCatalogPage />", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockRooms({
    myRooms = [],
    catalog = [],
  }: {
    myRooms?: Array<{
      membershipId: string;
      role: "owner" | "admin" | "member";
      joinedAt: string;
      room: {
        id: string;
        conversationId: string;
        name: string;
        description: string | null;
        visibility: "public" | "private";
      };
    }>;
    catalog?: Array<{
      id: string;
      conversationId: string;
      name: string;
      description: string | null;
      visibility: "public" | "private";
      memberCount: number;
      isMember: boolean;
    }>;
  }) {
    fetchMock.mockImplementation((url: RequestInfo | URL) => {
      const str = typeof url === "string" ? url : url.toString();
      if (str.startsWith("/api/me/rooms")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ rooms: myRooms }),
        } as Response);
      }
      if (str.includes("/api/rooms")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ rooms: catalog }),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);
    });
  }

  it("renders the caller's private rooms in a section above the public catalog", async () => {
    mockRooms({
      myRooms: [
        {
          membershipId: "m1",
          role: "member",
          joinedAt: new Date(2026, 0, 1).toISOString(),
          room: {
            id: "priv-1",
            conversationId: "cv-priv-1",
            name: "Secret Lab",
            description: null,
            visibility: "private",
          },
        },
        {
          membershipId: "m2",
          role: "member",
          joinedAt: new Date(2026, 0, 2).toISOString(),
          room: {
            id: "pub-joined",
            conversationId: "cv-pub-j",
            name: "General",
            description: null,
            visibility: "public",
          },
        },
      ],
      catalog: [
        {
          id: "pub-1",
          conversationId: "cv-pub-1",
          name: "Lounge",
          description: "Open chat",
          visibility: "public",
          memberCount: 12,
          isMember: false,
        },
      ],
    });

    renderWithClient(<RoomsCatalogPage />);

    await waitFor(() => {
      expect(screen.getByTestId("private-room-row-priv-1")).toBeInTheDocument();
    });

    const privateSection = screen.getByTestId("private-rooms-section");
    const publicSection = screen.getByTestId("public-rooms-section");

    expect(
      privateSection.compareDocumentPosition(publicSection) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(privateSection).toHaveTextContent("Secret Lab");
    expect(privateSection).not.toHaveTextContent("Lounge");
    expect(privateSection).not.toHaveTextContent("General");
    expect(publicSection).toHaveTextContent("Lounge");
  });

  it("applies the search term to both private and public sections", async () => {
    mockRooms({
      myRooms: [
        {
          membershipId: "m1",
          role: "member",
          joinedAt: new Date(2026, 0, 1).toISOString(),
          room: {
            id: "priv-1",
            conversationId: "cv-priv-1",
            name: "Secret Lab",
            description: null,
            visibility: "private",
          },
        },
        {
          membershipId: "m2",
          role: "member",
          joinedAt: new Date(2026, 0, 2).toISOString(),
          room: {
            id: "priv-2",
            conversationId: "cv-priv-2",
            name: "Board Room",
            description: null,
            visibility: "private",
          },
        },
      ],
      catalog: [],
    });

    renderWithClient(<RoomsCatalogPage />);

    await waitFor(() => {
      expect(screen.getByTestId("private-room-row-priv-1")).toBeInTheDocument();
      expect(screen.getByTestId("private-room-row-priv-2")).toBeInTheDocument();
    });

    await userEvent.type(
      screen.getByPlaceholderText("Search rooms…"),
      "board",
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId("private-room-row-priv-1"),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("private-room-row-priv-2")).toBeInTheDocument();
    });
  });

  it("shows an empty-state message when the caller has no private rooms", async () => {
    mockRooms({ myRooms: [], catalog: [] });

    renderWithClient(<RoomsCatalogPage />);

    await waitFor(() => {
      expect(screen.getByTestId("private-rooms-empty")).toBeInTheDocument();
    });
  });
});
