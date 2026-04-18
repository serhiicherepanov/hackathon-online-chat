"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConversationView } from "@/components/chat/conversation-view";
import { useMyDmContacts } from "@/lib/hooks/use-dm-contacts";
import {
  useBlockUser,
  useContacts,
  useUnblockUser,
} from "@/lib/hooks/use-contacts";

export default function DmConversationPage() {
  const params = useParams();
  const convId = typeof params.convId === "string" ? params.convId : "";

  const dms = useMyDmContacts();
  const contacts = useContacts();
  const block = useBlockUser();
  const unblock = useUnblockUser();

  const contact = useMemo(
    () => dms.data?.find((c) => c.conversationId === convId) ?? null,
    [convId, dms.data],
  );
  const frozen = Boolean(contact?.frozen);
  const peerId = contact?.peer.id ?? null;
  const iBlockedPeer = Boolean(
    peerId &&
      contacts.data?.blockedUsers.some((b) => b.peer.id === peerId),
  );

  const title = contact ? `DM · ${contact.peer.username}` : "Direct message";

  if (!convId) {
    return <div className="p-4 text-sm text-muted-foreground">Invalid conversation.</div>;
  }

  const headerExtra = peerId ? (
    iBlockedPeer ? (
      <Button
        size="sm"
        variant="outline"
        onClick={() => void unblock.mutate(peerId)}
        disabled={unblock.isPending}
      >
        Unblock
      </Button>
    ) : (
      <Button
        size="sm"
        variant="destructive"
        onClick={() => void block.mutate(peerId)}
        disabled={block.isPending}
      >
        Block
      </Button>
    )
  ) : null;

  const banner = frozen ? (
    <div
      className="border-b border-border bg-amber-500/10 px-4 py-2 text-sm text-amber-900 dark:text-amber-200"
      data-testid="dm-frozen-banner"
    >
      This conversation is frozen because {iBlockedPeer ? "you have" : "this user has"} blocked
      the other. History is visible but no new messages can be sent.
    </div>
  ) : null;

  return (
    <ConversationView
      conversationId={convId}
      channel={`dm:${convId}`}
      title={title}
      headerExtra={headerExtra}
      banner={banner}
      composerDisabled={frozen}
      composerDisabledReason="This direct message is read-only."
    />
  );
}
