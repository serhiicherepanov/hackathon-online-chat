"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ConversationView } from "@/components/chat/conversation-view";
import { MemberList } from "@/components/chat/member-list";
import { useMembers } from "@/lib/hooks/use-members";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";
import { RoomHeaderActions } from "@/components/chat/room-header-actions";

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
          description: string | null;
          visibility: "public" | "private";
        };
      };
    },
  });

  const members = useMembers(id);
  const myRooms = useMyRooms();

  if (!id || room.isLoading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">Loading room…</div>
    );
  }

  if (!room.data) {
    return <div className="p-4 text-sm text-muted-foreground">Room not found.</div>;
  }

  const convId = room.data.room.conversationId;
  const currentMembership = myRooms.data?.find((entry) => entry.room.id === id);

  return (
    <ConversationView
      conversationId={convId}
      channel={`room:${convId}`}
      title={room.data.room.name}
      headerExtra={
        <RoomHeaderActions
          roomId={room.data.room.id}
          roomName={room.data.room.name}
          roomDescription={room.data.room.description}
          roomVisibility={room.data.room.visibility}
          currentRole={currentMembership?.role ?? null}
        />
      }
      aside={
        <div>
          <p className="mb-2 text-sm font-medium">Members</p>
          <MemberList members={members.data} />
        </div>
      }
    />
  );
}
