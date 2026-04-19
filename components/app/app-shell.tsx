"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CentrifugeBoundary } from "@/components/errors/centrifuge-boundary";
import { CentrifugeProvider } from "@/components/providers/centrifuge-provider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { UnreadBadge } from "@/components/app/unread-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActivityHeartbeat } from "@/lib/hooks/use-activity-heartbeat";
import { useContacts } from "@/lib/hooks/use-contacts";
import { useMyDmContacts } from "@/lib/hooks/use-dm-contacts";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";
import { useRoomInvites } from "@/lib/hooks/use-room-invites";
import { filterByPeerUsername } from "@/lib/social/filter-contacts";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useToastStore } from "@/lib/stores/toast-store";
import { useUnreadStore } from "@/lib/stores/unread-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const setUnreadFromServer = useUnreadStore((s) => s.setFromServer);
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.remove);

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("me_failed");
      const json = (await res.json()) as {
        user: {
          id: string;
          email: string;
          username: string;
          createdAt: string;
        };
      };
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

  const myRooms = useMyRooms();
  const invites = useRoomInvites();
  const dmContacts = useMyDmContacts();
  const unreadMap = useUnreadStore((s) => s.map);

  const [dmOpen, setDmOpen] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const contacts = useContacts();
  const friends = contacts.data?.friends ?? [];
  const filteredFriends = useMemo(
    () => filterByPeerUsername(friends, dmQuery),
    [friends, dmQuery],
  );

  async function startDm(username: string) {
    const u = username.trim();
    if (!u) return;
    const res = await fetch(`/api/dm/${encodeURIComponent(u)}`, {
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
      const json = (await res.json()) as {
        room: { id: string };
      };
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

  const title = useMemo(() => "Online Chat", []);

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

  return (
    <CentrifugeBoundary>
      <CentrifugeProvider userId={user.id}>
        <div className="flex min-h-screen flex-col">
          <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-80 flex-col gap-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className="pointer-events-auto rounded-md border bg-background/95 p-3 shadow-lg"
              >
                <div className="text-sm font-medium">{toast.title}</div>
                {toast.description ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {toast.description}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <header className="flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Link href="/rooms" className="font-semibold">
                {title}
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm text-muted-foreground">
                {user.username}
                <span className="ml-2 text-xs opacity-70">#{user.id}</span>
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => void signOut()}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          <div className="flex min-h-0 flex-1">
            <aside className="hidden w-80 shrink-0 border-r border-border sidebar-bg md:flex md:flex-col">
              <ScrollArea className="h-[calc(100vh-57px)]">
                <div className="space-y-3 p-3">
                  <Button asChild className="w-full" size="sm" variant="outline">
                    <Link href="/contacts">Contacts</Link>
                  </Button>
                  <Accordion type="multiple" defaultValue={["rooms", "invites", "dms"]}>
                    <AccordionItem value="rooms">
                      <AccordionTrigger>Rooms</AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        <Button asChild className="w-full" size="sm" variant="secondary">
                          <Link href="/rooms">Browse / create</Link>
                        </Button>
                        <div className="space-y-1">
                          {(myRooms.data ?? []).map((r) => {
                            const href = `/rooms/${r.room.id}`;
                            const active = pathname === href;
                            const unread = unreadMap[r.room.conversationId] ?? 0;
                            return (
                              <Link
                                key={r.room.id}
                                href={href}
                                className={cn(
                                  "flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent",
                                  active && "bg-accent",
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  {r.room.name}
                                </span>
                                <UnreadBadge count={unread} />
                              </Link>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="invites">
                      <AccordionTrigger>
                        <span className="flex items-center gap-2">
                          Invites
                          {invites.data?.length ? (
                            <Badge variant="secondary">{invites.data.length}</Badge>
                          ) : null}
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        {invites.data?.length ? (
                          invites.data.map((invite) => (
                            <div
                              key={invite.id}
                              className="rounded-md border p-2 text-sm"
                              data-testid={`room-invite-${invite.id}`}
                            >
                              <div className="font-medium">{invite.room.name}</div>
                              <div className="text-xs text-muted-foreground">
                                Invited by {invite.inviter.username}
                              </div>
                              <div className="mt-2 flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void acceptInvite(invite.id)}
                                  disabled={inviteBusyId === invite.id}
                                >
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => void declineInvite(invite.id)}
                                  disabled={inviteBusyId === invite.id}
                                >
                                  Decline
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No pending invites.
                          </p>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="dms">
                      <AccordionTrigger>Direct messages</AccordionTrigger>
                      <AccordionContent className="space-y-2">
                        <Dialog open={dmOpen} onOpenChange={setDmOpen}>
                          <DialogTrigger asChild>
                            <Button className="w-full" size="sm" variant="outline">
                              + New DM
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Start a DM</DialogTitle>
                            </DialogHeader>
                            {friends.length === 0 ? (
                              <div
                                className="space-y-2 text-sm"
                                data-testid="dm-picker-empty"
                              >
                                <p className="text-muted-foreground">
                                  You don&apos;t have any contacts yet.
                                </p>
                                <Button
                                  asChild
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDmOpen(false)}
                                >
                                  <Link href="/contacts">Go to Contacts</Link>
                                </Button>
                              </div>
                            ) : (
                              <div
                                className="space-y-2"
                                data-testid="dm-picker"
                              >
                                <Input
                                  value={dmQuery}
                                  onChange={(e) => setDmQuery(e.target.value)}
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
                                      filteredFriends.map((f) => (
                                        <li key={f.friendshipId}>
                                          <button
                                            type="button"
                                            className="w-full rounded px-2 py-2 text-left text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                                            onClick={() =>
                                              void startDm(f.peer.username)
                                            }
                                          >
                                            {f.peer.username}
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

                        <div className="space-y-1">
                          {(dmContacts.data ?? []).map((c) => {
                            const href = `/dm/${c.conversationId}`;
                            const active = pathname === href;
                            const unread = unreadMap[c.conversationId] ?? 0;
                            return (
                              <Link
                                key={c.conversationId}
                                href={href}
                                className={cn(
                                  "flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-accent",
                                  active && "bg-accent",
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  {c.peer.username}
                                </span>
                                <UnreadBadge count={unread} />
                              </Link>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </ScrollArea>
            </aside>

            <main className="min-h-0 min-w-0 flex-1">{children}</main>
          </div>
        </div>
      </CentrifugeProvider>
    </CentrifugeBoundary>
  );
}
