"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { cn } from "@/lib/utils";

const STATUS_DOT: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  afk: "bg-amber-500",
  offline: "bg-muted-foreground/40",
};

export default function ContactsPage() {
  const contacts = useContacts();
  const send = useSendFriendRequest();
  const accept = useAcceptFriendRequest();
  const decline = useDeclineFriendRequest();
  const remove = useRemoveFriend();
  const block = useBlockUser();
  const unblock = useUnblockUser();

  const [newUserId, setNewUserId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function submitNewRequest(e: React.FormEvent) {
    e.preventDefault();
    const id = newUserId.trim();
    if (!id) return;
    setFormError(null);
    try {
      await send.mutateAsync(id);
      setNewUserId("");
    } catch (err) {
      setFormError((err as Error).message);
    }
  }

  if (contacts.isPending) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading contacts…</div>
    );
  }
  if (contacts.isError || !contacts.data) {
    return (
      <div className="p-6 text-sm text-destructive">
        Could not load contacts.
      </div>
    );
  }

  const data = contacts.data;

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
            value={newUserId}
            onChange={(e) => setNewUserId(e.target.value)}
            placeholder="User id"
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

      <section data-testid="contacts-inbound">
        <h2 className="text-sm font-semibold">Incoming requests</h2>
        {data.inboundRequests.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No pending incoming requests.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.inboundRequests.map((r) => (
              <li
                key={r.friendshipId}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
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
        {data.outboundRequests.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No pending outgoing requests.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.outboundRequests.map((r) => (
              <li
                key={r.friendshipId}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span className="font-medium">{r.peer.username}</span>
                <span className="text-xs text-muted-foreground">Awaiting response</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="contacts-friends">
        <h2 className="text-sm font-semibold">Friends</h2>
        {data.friends.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No friends yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.friends.map((f) => (
              <li
                key={f.friendshipId}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      STATUS_DOT[f.status],
                    )}
                  />
                  <span className="font-medium">{f.peer.username}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void remove.mutate(f.peer.id)}
                    disabled={remove.isPending}
                  >
                    Remove
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => void block.mutate(f.peer.id)}
                    disabled={block.isPending}
                  >
                    Block
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="contacts-blocked">
        <h2 className="text-sm font-semibold">Blocked</h2>
        {data.blockedUsers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No blocked users.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {data.blockedUsers.map((b) => (
              <li
                key={b.peer.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
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
