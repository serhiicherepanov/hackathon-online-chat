import { useQuery } from "@tanstack/react-query";

export type RoomInviteRow = {
  id: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  respondedAt: string | null;
  room: {
    id: string;
    conversationId: string;
    name: string;
    description: string | null;
    visibility: "public" | "private";
  };
  inviter: {
    id: string;
    username: string;
  };
  invitee: {
    id: string;
    username: string;
  };
};

export function useRoomInvites() {
  return useQuery({
    queryKey: ["me", "invites"],
    queryFn: async () => {
      const res = await fetch("/api/me/invites");
      if (!res.ok) throw new Error("room_invites_failed");
      const json = (await res.json()) as { invites: RoomInviteRow[] };
      return json.invites;
    },
  });
}
