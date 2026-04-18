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
import { useMyDmContacts } from "@/lib/hooks/use-dm-contacts";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useUnreadStore } from "@/lib/stores/unread-store";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const setUnreadFromServer = useUnreadStore((s) => s.setFromServer);

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
    void (async () => {
      const res = await fetch("/api/me/unread");
      if (!res.ok) return;
      const json = (await res.json()) as {
        unread: { conversationId: string; unread: number }[];
      };
      setUnreadFromServer(json.unread);
    })().catch(() => undefined);
  }, [setUnreadFromServer, me.data?.id]);

  const myRooms = useMyRooms();
  const dmContacts = useMyDmContacts();
  const unreadMap = useUnreadStore((s) => s.map);

  const [dmOpen, setDmOpen] = useState(false);
  const [dmUsername, setDmUsername] = useState("");

  async function startDm() {
    const u = dmUsername.trim();
    if (!u) return;
    const res = await fetch(`/api/dm/${encodeURIComponent(u)}`, {
      method: "POST",
    });
    if (!res.ok) return;
    const json = (await res.json()) as { conversationId: string };
    setDmOpen(false);
    setDmUsername("");
    await dmContacts.refetch();
    router.push(`/dm/${json.conversationId}`);
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    setUser(null);
    router.push("/sign-in");
    router.refresh();
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
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <Link href="/rooms" className="font-semibold">
                {title}
              </Link>
              <Separator orientation="vertical" className="h-6" />
              <span className="text-sm text-muted-foreground">
                {user.username}
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
            <aside className="hidden w-80 shrink-0 border-r border-border md:flex md:flex-col">
              <ScrollArea className="h-[calc(100vh-57px)]">
                <div className="p-3">
                  <Accordion type="multiple" defaultValue={["rooms", "dms"]}>
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
                                  "flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-accent",
                                  active && "bg-accent",
                                )}
                              >
                                <span className="truncate">{r.room.name}</span>
                                {unread > 0 ? (
                                  <Badge variant="secondary">{unread}</Badge>
                                ) : null}
                              </Link>
                            );
                          })}
                        </div>
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
                            <Input
                              value={dmUsername}
                              onChange={(e) => setDmUsername(e.target.value)}
                              placeholder="Username"
                            />
                            <DialogFooter>
                              <Button type="button" onClick={() => void startDm()}>
                                Open
                              </Button>
                            </DialogFooter>
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
                                  "flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-accent",
                                  active && "bg-accent",
                                )}
                              >
                                <span className="truncate">{c.peer.username}</span>
                                {unread > 0 ? (
                                  <Badge variant="secondary">{unread}</Badge>
                                ) : null}
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
