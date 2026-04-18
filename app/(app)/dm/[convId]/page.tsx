"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ConversationView } from "@/components/chat/conversation-view";
import { useMyDmContacts } from "@/lib/hooks/use-dm-contacts";

export default function DmConversationPage() {
  const params = useParams();
  const convId = typeof params.convId === "string" ? params.convId : "";

  const dms = useMyDmContacts();

  const title = useMemo(() => {
    const hit = dms.data?.find((c) => c.conversationId === convId);
    return hit ? `DM · ${hit.peer.username}` : "Direct message";
  }, [convId, dms.data]);

  if (!convId) {
    return <div className="p-4 text-sm text-muted-foreground">Invalid conversation.</div>;
  }

  return (
    <ConversationView
      conversationId={convId}
      channel={`dm:${convId}`}
      title={title}
    />
  );
}
