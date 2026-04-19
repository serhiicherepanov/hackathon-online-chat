"use client";

import copyToClipboard from "copy-to-clipboard";
import { Check, Copy, UserPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/chat/user-avatar";
import { PRESENCE_LABEL } from "@/lib/avatar";
import { useContacts, useSendFriendRequest } from "@/lib/hooks/use-contacts";
import type { MemberRow } from "@/lib/hooks/use-members";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePresenceStore, type PresenceRow } from "@/lib/stores/presence-store";
import type { PresenceStatus } from "@/lib/realtime/payloads";
import { cn } from "@/lib/utils";

type RowRelationship = "self" | "friend" | "pending" | "blocked" | "addable";

function CopyIdButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const handle = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(handle);
  }, [copied]);

  const onClick = useCallback(() => {
    const ok = copyToClipboard(userId);
    if (ok) setCopied(true);
  }, [userId]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        copied ? `User id copied` : `Copy user id ${userId}`
      }
      className="inline-flex items-center gap-1 rounded border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-testid="member-copy-id"
      data-user-id={userId}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" aria-hidden />
          <span data-testid="member-copy-id-feedback">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" aria-hidden />
          <span className="max-w-[120px] truncate font-mono">{userId}</span>
        </>
      )}
    </button>
  );
}

function AddFriendButton({
  userId,
  username,
}: {
  userId: string;
  username: string;
}) {
  const mutation = useSendFriendRequest();
  const [sent, setSent] = useState(false);

  const onClick = useCallback(async () => {
    try {
      await mutation.mutateAsync(username);
      setSent(true);
    } catch {
      // mutation state already reflects failure
    }
  }, [mutation, username]);

  if (sent || mutation.isSuccess) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded border border-border/40 px-1.5 py-0.5 text-[10px] text-muted-foreground"
        data-testid="member-add-friend-pending"
        data-user-id={userId}
      >
        Pending
      </span>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="h-6 gap-1 px-2 text-[11px]"
      onClick={() => void onClick()}
      disabled={mutation.isPending}
      data-testid="member-add-friend"
      data-user-id={userId}
      aria-label={`Send friend request to ${username}`}
    >
      <UserPlus className="h-3 w-3" aria-hidden />
      Add friend
    </Button>
  );
}

export function MemberList({ members }: { members: MemberRow[] | undefined }) {
  const map = usePresenceStore((s) => s.map);
  const merge = usePresenceStore((s) => s.merge);
  const selfUserId = useAuthStore((s) => s.user?.id ?? null);
  const contacts = useContacts();

  const relationshipById = useMemo(() => {
    const out = new Map<string, RowRelationship>();
    if (!contacts.data) return out;
    for (const f of contacts.data.friends) {
      out.set(f.peer.id, "friend");
    }
    for (const r of contacts.data.inboundRequests) {
      out.set(r.peer.id, "pending");
    }
    for (const r of contacts.data.outboundRequests) {
      out.set(r.peer.id, "pending");
    }
    for (const b of contacts.data.blockedUsers) {
      out.set(b.peer.id, "blocked");
    }
    return out;
  }, [contacts.data]);

  useEffect(() => {
    if (!members?.length) return;
    const ids = members.map((m) => m.userId).join(",");
    const poll = () => {
      void fetch(`/api/presence?userIds=${encodeURIComponent(ids)}`)
        .then((r) => r.json())
        .then((j: { presence: PresenceRow[] }) => {
          merge(j.presence ?? []);
        })
        .catch(() => undefined);
    };
    poll();
    const handle = window.setInterval(poll, 5000);
    return () => window.clearInterval(handle);
  }, [members, merge]);

  if (!members) {
    return <p className="text-sm text-muted-foreground">Loading members…</p>;
  }

  return (
    <div className="space-y-2">
      {members.map((m) => {
        const status: PresenceStatus = map[m.userId] ?? "offline";
        const relationship: RowRelationship =
          m.userId === selfUserId
            ? "self"
            : relationshipById.get(m.userId) ?? "addable";
        return (
          <div
            key={m.userId}
            className="flex items-start gap-2 rounded-md px-1 py-1 text-sm"
            data-testid={`member-${m.username}`}
            data-presence={status}
            data-relationship={relationship}
            title={PRESENCE_LABEL[status]}
          >
            <UserAvatar
              userId={m.userId}
              username={m.username}
              avatarUrl={m.avatarUrl}
              size={28}
              testId={`member-avatar-${m.userId}`}
              presence={status}
              presenceTestId={`member-presence-${m.userId}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium">{m.username}</span>
                <span className="text-xs text-muted-foreground">
                  ({m.role})
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <CopyIdButton userId={m.userId} />
                {relationship === "addable" ? (
                  <AddFriendButton userId={m.userId} username={m.username} />
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
