"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ConversationView } from "@/components/chat/conversation-view";
import { MemberList } from "@/components/chat/member-list";
import { useMembers } from "@/lib/hooks/use-members";

export default function RoomConversationPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";

  const room = useQuery({
    queryKey: ["rooms", id, "meta"],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${id}`);
      if (!res.ok) throw new Error("room_failed");
      return (await res.json()) as {
        room: {
          id: string;
          conversationId: string;
          name: string;
        };
      };
    },
  });

  const members = useMembers(id);

  if (!id || room.isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading room…</div>
    );
  }

  if (!room.data) {
    return <div className="p-4 text-sm text-muted-foreground">Room not found.</div>;
  }

  const convId = room.data.room.conversationId;

  return (
    <ConversationView
      conversationId={convId}
      channel={`room:${convId}`}
      title={room.data.room.name}
      aside={
        <div>
          <p className="mb-2 text-sm font-medium">Members</p>
          <MemberList members={members.data} />
        </div>
      }
    />
  );
}
