import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { usePresenceStore } from "@/lib/stores/presence-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useUnreadStore } from "@/lib/stores/unread-store";

const navigation = {
  pathname: "/rooms/room-1",
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
};

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({
    push: navigation.push,
    replace: navigation.replace,
    refresh: navigation.refresh,
  }),
}));

vi.mock("@/components/errors/centrifuge-boundary", () => ({
  CentrifugeBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/providers/centrifuge-provider", () => ({
  CentrifugeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

const roomsData = [
  {
    room: {
      id: "room-1",
      name: "General",
      conversationId: "conv-room-1",
    },
    role: "member",
  },
];

const dmData = [
  {
    conversationId: "dm-1",
    peer: {
      id: "user-2",
      username: "alice",
      avatarUrl: null,
    },
  },
];

vi.mock("@/lib/hooks/use-my-rooms", () => ({
  useMyRooms: () => ({
    data: roomsData,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-room-invites", () => ({
  useRoomInvites: () => ({
    data: [],
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-dm-contacts", () => ({
  useMyDmContacts: () => ({
    data: dmData,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/lib/hooks/use-contacts", () => ({
  useContacts: () => ({
    data: {
      friends: [
        {
          friendshipId: "friend-1",
          peer: {
            id: "user-2",
            username: "alice",
            avatarUrl: null,
          },
        },
      ],
    },
  }),
}));

vi.mock("@/lib/hooks/use-activity-heartbeat", () => ({
  useActivityHeartbeat: vi.fn(),
}));

function renderShell() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AppShell>
        <div>Child content</div>
      </AppShell>
    </QueryClientProvider>,
  );
}

describe("AppShell mobile navigation", () => {
  beforeEach(() => {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

    navigation.pathname = "/rooms/room-1";
    navigation.push.mockReset();
    navigation.replace.mockReset();
    navigation.refresh.mockReset();

    useAuthStore.setState({ user: null, setUser: useAuthStore.getState().setUser });
    useToastStore.setState({ toasts: [], push: useToastStore.getState().push, remove: useToastStore.getState().remove });
    useUnreadStore.setState({
      map: { "conv-room-1": 3, "dm-1": 1 },
      setFromServer: useUnreadStore.getState().setFromServer,
      mergeDelta: useUnreadStore.getState().mergeDelta,
      setCount: useUnreadStore.getState().setCount,
      clear: useUnreadStore.getState().clear,
    });
    usePresenceStore.setState({
      map: { "user-2": "online" },
      merge: usePresenceStore.getState().merge,
      setStatus: usePresenceStore.getState().setStatus,
    });
    useConnectionStore.getState().setState("connected");

    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/api/auth/me")) {
        return new Response(
          JSON.stringify({
            user: {
              id: "user-1",
              email: "me@example.com",
              username: "bob",
              displayName: null,
              avatarUrl: null,
              createdAt: "2026-01-01T00:00:00.000Z",
            },
          }),
          { status: 200 },
        );
      }

      if (url.endsWith("/api/me/unread")) {
        return new Response(
          JSON.stringify({
            unread: [
              { conversationId: "conv-room-1", unread: 3 },
              { conversationId: "dm-1", unread: 1 },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.includes("/api/presence?userIds=")) {
        return new Response(
          JSON.stringify({
            presence: [{ userId: "user-2", status: "online" }],
          }),
          { status: 200 },
        );
      }

      return new Response("{}", { status: 200 });
    }) as typeof fetch;
  });

  it("shows a compact mobile route context while keeping the burger trigger available", async () => {
    navigation.pathname = "/dm/dm-1";

    renderShell();

    expect(await screen.findByTestId("mobile-nav-trigger")).toBeInTheDocument();
    expect(await screen.findByTestId("mobile-route-context")).toHaveTextContent("DM · alice");
  });

  it("opens the mobile drawer and closes it after selecting a destination", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(await screen.findByTestId("mobile-nav-trigger"));

    const dialog = await screen.findByRole("dialog", { name: "Navigation" });
    expect(within(dialog).getByTestId("sidebar-room-row-room-1")).toBeInTheDocument();

    await user.click(within(dialog).getByTestId("sidebar-room-row-room-1"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Navigation" })).not.toBeInTheDocument();
    });
  });
});
