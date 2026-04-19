"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { UserAvatar } from "@/components/chat/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PRESENCE_LABEL } from "@/lib/avatar";
import {
  useAcceptFriendRequest,
  useBlockUser,
  useContacts,
  useDeclineFriendRequest,
  useRemoveFriend,
  useSendFriendRequest,
  useUnblockUser,
} from "@/lib/hooks/use-contacts";
import type { PresenceStatus } from "@/lib/realtime/payloads";
import { filterByPeerUsername } from "@/lib/social/filter-contacts";

export default function ContactsPage() {
  const router = useRouter();
  const contacts = useContacts();
  const send = useSendFriendRequest();
  const accept = useAcceptFriendRequest();
  const decline = useDeclineFriendRequest();
  const remove = useRemoveFriend();
  const block = useBlockUser();
  const unblock = useUnblockUser();

  const [identifier, setIdentifier] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openingDmFor, setOpeningDmFor] = useState<string | null>(null);

  async function submitNewRequest(e: React.FormEvent) {
    e.preventDefault();
    const value = identifier.trim();
    if (!value) return;
    setFormError(null);
    try {
      await send.mutateAsync(value);
      setIdentifier("");
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  async function openDmWith(username: string) {
    setOpeningDmFor(username);
    try {
      const res = await fetch(`/api/dm/${encodeURIComponent(username)}`, {
        method: "POST",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { conversationId: string };
      router.push(`/dm/${json.conversationId}`);
    } finally {
      setOpeningDmFor(null);
    }
  }

  const data = contacts.data;
  const filteredFriends = useMemo(
    () => filterByPeerUsername(data?.friends ?? [], query),
    [data?.friends, query],
  );
  const filteredInbound = useMemo(
    () => filterByPeerUsername(data?.inboundRequests ?? [], query),
    [data?.inboundRequests, query],
  );
  const filteredOutbound = useMemo(
    () => filterByPeerUsername(data?.outboundRequests ?? [], query),
    [data?.outboundRequests, query],
  );
  const filteredBlocked = useMemo(
    () => filterByPeerUsername(data?.blockedUsers ?? [], query),
    [data?.blockedUsers, query],
  );

  if (contacts.isPending) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading contacts…</div>
    );
  }
  if (contacts.isError || !data) {
    return (
      <div className="p-6 text-sm text-destructive">
        Could not load contacts.
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
      <header>
        <h1 className="text-xl font-semibold">Contacts</h1>
        <p className="text-sm text-muted-foreground">
          Manage your friends, pending requests, and blocked users.
        </p>
      </header>

      <section data-testid="contacts-new-request">
        <h2 className="text-sm font-semibold">Send a friend request</h2>
        <form className="mt-2 flex gap-2" onSubmit={submitNewRequest}>
          <Input
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="User id, username, or email"
            aria-label="User id, username, or email"
            className="max-w-xs"
          />
          <Button type="submit" disabled={send.isPending}>
            Send request
          </Button>
        </form>
        {formError ? (
          <p className="mt-2 text-sm text-destructive">{formError}</p>
        ) : null}
      </section>

      <Separator />

      <section data-testid="contacts-search">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search contacts by username"
          aria-label="Search contacts"
          className="max-w-xs"
        />
      </section>

      <section data-testid="contacts-inbound">
        <h2 className="text-sm font-semibold">Incoming requests</h2>
        {filteredInbound.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No pending incoming requests.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {filteredInbound.map((r) => (
              <li
                key={r.friendshipId}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 px-4 py-3 text-sm shadow-sm"
              >
                <span className="font-medium">{r.peer.username}</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => void accept.mutate(r.friendshipId)}
                    disabled={accept.isPending}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void decline.mutate(r.friendshipId)}
                    disabled={decline.isPending}
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="contacts-outbound">
        <h2 className="text-sm font-semibold">Outgoing requests</h2>
        {filteredOutbound.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No pending outgoing requests.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {filteredOutbound.map((r) => (
              <li
                key={r.friendshipId}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 px-4 py-3 text-sm shadow-sm"
              >
                <span className="font-medium">{r.peer.username}</span>
                <span className="text-xs text-muted-foreground">
                  Awaiting response
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="contacts-friends">
        <h2 className="text-sm font-semibold">Friends</h2>
        {filteredFriends.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No friends yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {filteredFriends.map((f) => {
              const opening = openingDmFor === f.peer.username;
              return (
                <li
                  key={f.friendshipId}
                  className="rounded-xl border border-border/50 bg-card/60 text-sm shadow-sm overflow-hidden"
                  data-testid="contacts-friend-row"
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Open DM with ${f.peer.username}`}
                    aria-busy={opening || undefined}
                    onClick={() => void openDmWith(f.peer.username)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void openDmWith(f.peer.username);
                      }
                    }}
                    className="flex cursor-pointer items-center justify-between px-4 py-3 transition-colors hover:bg-accent/50 focus:bg-accent/50 focus:outline-none"
                    data-presence={f.status}
                    title={PRESENCE_LABEL[f.status]}
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        userId={f.peer.id}
                        username={f.peer.username}
                        avatarUrl={f.peer.avatarUrl}
                        size={32}
                        testId={`contacts-friend-avatar-${f.peer.id}`}
                        presence={f.status as PresenceStatus}
                        presenceTestId={`contacts-friend-presence-${f.peer.id}`}
                      />
                      <span className="font-medium">{f.peer.username}</span>
                    </div>
                    <div
                      className="flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          void remove.mutate(f.peer.id);
                        }}
                        disabled={remove.isPending}
                      >
                        Remove
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          void block.mutate(f.peer.id);
                        }}
                        disabled={block.isPending}
                      >
                        Block
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section data-testid="contacts-blocked">
        <h2 className="text-sm font-semibold">Blocked</h2>
        {filteredBlocked.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No blocked users.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {filteredBlocked.map((b) => (
              <li
                key={b.peer.id}
                className="flex items-center justify-between rounded-xl border border-border/50 bg-card/60 px-4 py-3 text-sm shadow-sm"
              >
                <span className="font-medium">{b.peer.username}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void unblock.mutate(b.peer.id)}
                  disabled={unblock.isPending}
                >
                  Unblock
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
