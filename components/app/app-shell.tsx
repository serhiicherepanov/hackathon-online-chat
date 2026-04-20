"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Menu, MessageSquarePlus, MoreHorizontal, Search, SquarePen } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppToastViewport } from "@/components/app/app-toast-viewport";
import { CopyUserIdButton } from "@/components/app/copy-user-id-button";
import { SidebarDmRow, SidebarRoomRow } from "@/components/app/sidebar-conversation-row";
import { CreateRoomDialog } from "@/components/chat/create-room-dialog";
import { CentrifugeBoundary } from "@/components/errors/centrifuge-boundary";
import { CentrifugeProvider } from "@/components/providers/centrifuge-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { SidebarInvitesList } from "@/components/app/sidebar-invites-list";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useActivityHeartbeat } from "@/lib/hooks/use-activity-heartbeat";
import {
  isRunningStandalone,
  useInstallPromptStore,
} from "@/lib/pwa/install-prompt";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useMyDmContacts } from "@/lib/hooks/use-dm-contacts";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";
import { useRoomInvites } from "@/lib/hooks/use-room-invites";
import type { PresenceStatus } from "@/lib/realtime/payloads";
import type { FriendRequestDto } from "@/lib/social/serialize";
import { filterByPeerUsername } from "@/lib/social/filter-contacts";
import type { AuthUser } from "@/lib/stores/auth-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useConnectionStore } from "@/lib/stores/connection-store";
import { type PresenceRow, usePresenceStore } from "@/lib/stores/presence-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useUnreadStore } from "@/lib/stores/unread-store";

type SidebarContentProps = {
  pathname: string;
  invites: ReturnType<typeof useRoomInvites>["data"];
  friendRequests: FriendRequestDto[];
  inviteBusyId: string | null;
  friendInviteBusyId: string | null;
  onAcceptInvite: (inviteId: string) => Promise<void>;
  onDeclineInvite: (inviteId: string) => Promise<void>;
  onAcceptFriendRequest: (friendshipId: string) => Promise<void>;
  onDeclineFriendRequest: (friendshipId: string) => Promise<void>;
  dmContacts: ReturnType<typeof useMyDmContacts>["data"];
  myRooms: ReturnType<typeof useMyRooms>["data"];
  unreadMap: Record<string, number>;
  presenceMap: Record<string, PresenceStatus>;
  onOpenDm: () => void;
  onOpenCreateRoom: () => void;
  onNavigate?: () => void;
};

function getRouteContext(
  pathname: string,
  rooms: ReturnType<typeof useMyRooms>["data"],
  dms: ReturnType<typeof useMyDmContacts>["data"],
) {
  if (pathname.startsWith("/dm/")) {
    const conversationId = pathname.replace("/dm/", "");
    const dm = dms?.find((item) => item.conversationId === conversationId);
    return dm ? `DM · ${dm.peer.username}` : "Direct message";
  }

  if (pathname.startsWith("/rooms/")) {
    const roomId = pathname.replace("/rooms/", "");
    const room = rooms?.find((item) => item.room.id === roomId);
    return room?.room.name ?? "Room";
  }

  if (pathname === "/contacts") return "Contacts";
  if (pathname === "/settings") return "Settings";
  if (pathname === "/rooms") return "Public rooms";

  return "Online Chat";
}

function SidebarNavigationContent({
  pathname,
  invites,
  friendRequests,
  inviteBusyId,
  friendInviteBusyId,
  onAcceptInvite,
  onDeclineInvite,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
  dmContacts,
  myRooms,
  unreadMap,
  presenceMap,
  onOpenDm,
  onOpenCreateRoom,
  onNavigate,
}: SidebarContentProps) {
  const totalInvites = (invites?.length ?? 0) + friendRequests.length;

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-3 p-3">
        <Button asChild className="w-full" size="sm" variant="outline">
          <Link href="/contacts" onClick={onNavigate}>
            Contacts
          </Link>
        </Button>

        <Accordion type="multiple" defaultValue={["invites", "dms", "rooms"]}>
          <AccordionItem value="invites" data-testid="sidebar-section-invites">
            <AccordionTrigger>
              <span className="flex items-center gap-2">
                Invites
                {totalInvites > 0 ? <Badge variant="secondary">{totalInvites}</Badge> : null}
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              <SidebarInvitesList
                roomInvites={invites ?? []}
                friendRequests={friendRequests}
                busyRoomInviteId={inviteBusyId}
                busyFriendRequestId={friendInviteBusyId}
                onAcceptRoomInvite={(id) => void onAcceptInvite(id)}
                onDeclineRoomInvite={(id) => void onDeclineInvite(id)}
                onAcceptFriendRequest={(id) => void onAcceptFriendRequest(id)}
                onDeclineFriendRequest={(id) => void onDeclineFriendRequest(id)}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="dms" data-testid="sidebar-section-dms">
            <AccordionTrigger
              actions={
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  aria-label="New DM"
                  data-testid="sidebar-new-dm-button"
                  onClick={onOpenDm}
                >
                  <MessageSquarePlus className="h-4 w-4" />
                </Button>
              }
            >
              Direct messages
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div className="space-y-1">
                {(dmContacts ?? []).map((contact) => {
                  const active = pathname === `/dm/${contact.conversationId}`;
                  const unread = unreadMap[contact.conversationId] ?? 0;
                  const status = presenceMap[contact.peer.id] ?? "offline";

                  return (
                    <SidebarDmRow
                      key={contact.conversationId}
                      conversationId={contact.conversationId}
                      peer={contact.peer}
                      unread={unread}
                      active={active}
                      presence={status}
                      onClick={onNavigate}
                    />
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="rooms" data-testid="sidebar-section-rooms">
            <AccordionTrigger
              actions={
                <>
                  <Button
                    asChild
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    data-testid="sidebar-browse-rooms-button"
                  >
                    <Link href="/rooms" aria-label="Browse rooms" onClick={onNavigate}>
                      <Search className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="Create room"
                    data-testid="sidebar-create-room-button"
                    onClick={onOpenCreateRoom}
                  >
                    <SquarePen className="h-4 w-4" />
                  </Button>
                </>
              }
            >
              Rooms
            </AccordionTrigger>
            <AccordionContent className="space-y-2">
              <div className="space-y-1">
                {(myRooms ?? []).map((entry) => {
                  const active = pathname === `/rooms/${entry.room.id}`;
                  const unread = unreadMap[entry.room.conversationId] ?? 0;

                  return (
                    <SidebarRoomRow
                      key={entry.room.id}
                      room={entry.room}
                      unread={unread}
                      active={active}
                      onClick={onNavigate}
                    />
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </ScrollArea>
  );
}

function AccountDropdown({
  onOpenSettings,
  onSignOut,
}: {
  onOpenSettings: () => void;
  onSignOut: () => Promise<void>;
}) {
  const deferredPrompt = useInstallPromptStore((s) => s.deferredPrompt);
  const installed = useInstallPromptStore((s) => s.installed);
  const clearPrompt = useInstallPromptStore((s) => s.setPrompt);
  const canInstall = Boolean(deferredPrompt) && !installed && !isRunningStandalone();

  async function onInstall() {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      clearPrompt(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="hidden md:inline-flex">
          Account
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canInstall ? (
          <DropdownMenuItem
            onClick={() => void onInstall()}
            data-testid="install-app-menu-item"
          >
            Install app
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={onOpenSettings}>Settings</DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onSignOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ShellUserPanel({
  user,
  realtimeStatus,
  onOpenSettings,
  onSignOut,
}: {
  user: AuthUser;
  realtimeStatus: string;
  onOpenSettings: () => void;
  onSignOut: () => Promise<void>;
}) {
  return (
    <div className="space-y-4 p-4" data-testid="shell-user-panel">
      <div className="space-y-1">
        <div className="text-sm font-medium">{user.username}</div>
        <div className="text-xs text-muted-foreground">#{user.id}</div>
      </div>
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
        Realtime: <span className="font-medium capitalize">{realtimeStatus}</span>
      </div>
      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" onClick={onOpenSettings}>
          Settings
        </Button>
        <Button type="button" variant="destructive" onClick={() => void onSignOut()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);
  const setUnreadFromServer = useUnreadStore((state) => state.setFromServer);
  const realtimeStatus = useConnectionStore((state) => state.state);
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.remove);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("me_failed");
      const json = (await res.json()) as { user: AuthUser };
      return json.user;
    },
  });

  useEffect(() => {
    if (me.isPending) return;
    if (me.data === null) router.replace("/sign-in");
  }, [me.data, me.isPending, router]);

  useEffect(() => {
    if (me.data === undefined) return;
    setUser(me.data);
  }, [me.data, setUser]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const handles = toasts.map((toast) =>
      window.setTimeout(() => {
        removeToast(toast.id);
      }, 4000),
    );
    return () => {
      handles.forEach((handle) => window.clearTimeout(handle));
    };
  }, [removeToast, toasts]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/me/unread");
      if (!res.ok) return;
      const json = (await res.json()) as {
        unread: { conversationId: string; unread: number }[];
      };
      setUnreadFromServer(json.unread);
    })().catch(() => undefined);
  }, [setUnreadFromServer, me.data?.id]);

  useActivityHeartbeat(Boolean(user?.id));

  const queryClient = useQueryClient();
  const myRooms = useMyRooms();
  const invites = useRoomInvites();
  const dmContacts = useMyDmContacts();
  const [friendInviteBusyId, setFriendInviteBusyId] = useState<string | null>(
    null,
  );
  const unreadMap = useUnreadStore((state) => state.map);
  const presenceMap = usePresenceStore((state) => state.map);
  const mergePresence = usePresenceStore((state) => state.merge);

  const [dmOpen, setDmOpen] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [createRoomOpen, setCreateRoomOpen] = useState(false);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  const contacts = useContacts();
  const friends = useMemo(() => contacts.data?.friends ?? [], [contacts.data?.friends]);
  const filteredFriends = useMemo(
    () => filterByPeerUsername(friends, dmQuery),
    [friends, dmQuery],
  );
  const inboundFriendRequests = useMemo(
    () => contacts.data?.inboundRequests ?? [],
    [contacts.data?.inboundRequests],
  );
  const dmPeerIds = useMemo(
    () =>
      Array.from(
        new Set(
          (dmContacts.data ?? [])
            .map((row) => row.peer.id)
            .filter((userId): userId is string => Boolean(userId)),
        ),
      ),
    [dmContacts.data],
  );
  const routeContext = useMemo(
    () => getRouteContext(pathname, myRooms.data, dmContacts.data),
    [dmContacts.data, myRooms.data, pathname],
  );

  useEffect(() => {
    setMobileNavOpen(false);
    setMobileDetailsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (dmPeerIds.length === 0) return;

    const controller = new AbortController();
    const batches: string[][] = [];
    for (let index = 0; index < dmPeerIds.length; index += 1000) {
      batches.push(dmPeerIds.slice(index, index + 1000));
    }

    void Promise.all(
      batches.map(async (batch) => {
        const res = await fetch(
          `/api/presence?userIds=${encodeURIComponent(batch.join(","))}`,
          { signal: controller.signal },
        );
        if (!res.ok) return [] as PresenceRow[];
        const json = (await res.json()) as { presence?: PresenceRow[] };
        return json.presence ?? [];
      }),
    )
      .then((rowsByBatch) => {
        if (controller.signal.aborted) return;
        mergePresence(rowsByBatch.flat());
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [dmPeerIds, mergePresence]);

  async function startDm(username: string) {
    const trimmed = username.trim();
    if (!trimmed) return;

    const res = await fetch(`/api/dm/${encodeURIComponent(trimmed)}`, {
      method: "POST",
    });
    if (!res.ok) return;

    const json = (await res.json()) as { conversationId: string };
    setDmOpen(false);
    setDmQuery("");
    await dmContacts.refetch();
    router.push(`/dm/${json.conversationId}`);
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    setUser(null);
    router.push("/sign-in");
    router.refresh();
  }

  async function acceptInvite(inviteId: string) {
    setInviteBusyId(inviteId);
    try {
      const res = await fetch(`/api/invites/${inviteId}/accept`, { method: "POST" });
      if (!res.ok) return;
      const json = (await res.json()) as { room: { id: string } };
      await Promise.all([invites.refetch(), myRooms.refetch()]);
      router.push(`/rooms/${json.room.id}`);
    } finally {
      setInviteBusyId(null);
    }
  }

  async function declineInvite(inviteId: string) {
    setInviteBusyId(inviteId);
    try {
      const res = await fetch(`/api/invites/${inviteId}/decline`, { method: "POST" });
      if (!res.ok) return;
      await invites.refetch();
    } finally {
      setInviteBusyId(null);
    }
  }

  async function acceptFriendRequest(friendshipId: string) {
    setFriendInviteBusyId(friendshipId);
    try {
      const res = await fetch(
        `/api/friends/requests/${friendshipId}/accept`,
        { method: "POST" },
      );
      if (!res.ok) return;
      await queryClient.invalidateQueries({ queryKey: ["me", "friends"] });
    } finally {
      setFriendInviteBusyId(null);
    }
  }

  async function declineFriendRequest(friendshipId: string) {
    setFriendInviteBusyId(friendshipId);
    try {
      const res = await fetch(
        `/api/friends/requests/${friendshipId}/decline`,
        { method: "POST" },
      );
      if (!res.ok) return;
      await queryClient.invalidateQueries({ queryKey: ["me", "friends"] });
    } finally {
      setFriendInviteBusyId(null);
    }
  }
  if (me.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  const title = "Online Chat";

  return (
    <CentrifugeBoundary>
      <CentrifugeProvider userId={user.id}>
        <div className="flex h-screen min-h-0 flex-col" data-realtime-status={realtimeStatus}>
          <AppToastViewport toasts={toasts} />
          <Dialog open={dmOpen} onOpenChange={setDmOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start a DM</DialogTitle>
              </DialogHeader>
              {friends.length === 0 ? (
                <div className="space-y-2 text-sm" data-testid="dm-picker-empty">
                  <p className="text-muted-foreground">You don&apos;t have any contacts yet.</p>
                  <Button asChild size="sm" variant="outline" onClick={() => setDmOpen(false)}>
                    <Link href="/contacts">Go to Contacts</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2" data-testid="dm-picker">
                  <Input
                    value={dmQuery}
                    onChange={(event) => setDmQuery(event.target.value)}
                    placeholder="Search contacts"
                    aria-label="Search contacts"
                  />
                  <ScrollArea className="h-60 rounded border">
                    <ul className="p-1">
                      {filteredFriends.length === 0 ? (
                        <li className="px-2 py-3 text-sm text-muted-foreground">
                          No contacts match.
                        </li>
                      ) : (
                        filteredFriends.map((friend) => (
                          <li key={friend.friendshipId}>
                            <button
                              type="button"
                              className="w-full rounded px-2 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                              onClick={() => void startDm(friend.peer.username)}
                            >
                              {friend.peer.username}
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  </ScrollArea>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <CreateRoomDialog
            open={createRoomOpen}
            onOpenChange={setCreateRoomOpen}
            onCreated={(roomId) => {
              router.push(`/rooms/${roomId}`);
            }}
          />

          <header className="flex items-center justify-between gap-3 border-b border-border bg-card/80 px-3 py-3 shadow-sm backdrop-blur-sm md:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="md:hidden"
                    aria-label="Open navigation"
                    data-testid="mobile-nav-trigger"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="flex w-[min(85vw,22rem)] flex-col gap-0 p-0"
                  data-testid="mobile-nav-sheet"
                >
                  <SheetHeader className="border-b p-4 text-left">
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>
                      Switch between invites, direct messages, and rooms.
                    </SheetDescription>
                  </SheetHeader>
                  <SidebarNavigationContent
                    pathname={pathname}
                    invites={invites.data}
                    friendRequests={inboundFriendRequests}
                    inviteBusyId={inviteBusyId}
                    friendInviteBusyId={friendInviteBusyId}
                    onAcceptInvite={acceptInvite}
                    onDeclineInvite={declineInvite}
                    onAcceptFriendRequest={acceptFriendRequest}
                    onDeclineFriendRequest={declineFriendRequest}
                    dmContacts={dmContacts.data}
                    myRooms={myRooms.data}
                    unreadMap={unreadMap}
                    presenceMap={presenceMap}
                    onOpenDm={() => setDmOpen(true)}
                    onOpenCreateRoom={() => setCreateRoomOpen(true)}
                    onNavigate={() => setMobileNavOpen(false)}
                  />
                </SheetContent>
              </Sheet>

              <div className="min-w-0 md:hidden">
                <p className="truncate text-sm font-medium" data-testid="mobile-route-context">
                  {routeContext}
                </p>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <Link href="/rooms" className="font-semibold">
                  {title}
                </Link>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-sm text-muted-foreground">
                  {user.username}
                  <CopyUserIdButton
                    userId={user.id}
                    className="ml-2 align-middle"
                    testId="current-user-id-button"
                  />
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Sheet open={mobileDetailsOpen} onOpenChange={setMobileDetailsOpen}>
                <SheetTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="md:hidden"
                    aria-label="Open account details"
                    data-testid="mobile-details-trigger"
                  >
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[min(85vw,22rem)] p-0">
                  <SheetHeader className="border-b p-4 text-left">
                    <SheetTitle>Account</SheetTitle>
                    <SheetDescription>
                      Access account actions without crowding the mobile header.
                    </SheetDescription>
                  </SheetHeader>
                  <ShellUserPanel
                    user={user}
                    realtimeStatus={realtimeStatus}
                    onOpenSettings={() => {
                      setMobileDetailsOpen(false);
                      router.push("/settings");
                    }}
                    onSignOut={signOut}
                  />
                </SheetContent>
              </Sheet>

              <AccountDropdown
                onOpenSettings={() => router.push("/settings")}
                onSignOut={signOut}
              />
            </div>
          </header>

          <div className="flex min-h-0 flex-1">
            <aside className="hidden w-80 shrink-0 border-r border-border sidebar-bg md:flex md:flex-col">
              <SidebarNavigationContent
                pathname={pathname}
                invites={invites.data}
                friendRequests={inboundFriendRequests}
                inviteBusyId={inviteBusyId}
                friendInviteBusyId={friendInviteBusyId}
                onAcceptInvite={acceptInvite}
                onDeclineInvite={declineInvite}
                onAcceptFriendRequest={acceptFriendRequest}
                onDeclineFriendRequest={declineFriendRequest}
                dmContacts={dmContacts.data}
                myRooms={myRooms.data}
                unreadMap={unreadMap}
                presenceMap={presenceMap}
                onOpenDm={() => setDmOpen(true)}
                onOpenCreateRoom={() => setCreateRoomOpen(true)}
              />
            </aside>

            <main className="min-h-0 min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </CentrifugeProvider>
    </CentrifugeBoundary>
  );
}
