import { useQuery } from "@tanstack/react-query";

export type MyRoomRow = {
  membershipId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  room: {
    id: string;
    conversationId: string;
    name: string;
    description: string | null;
    visibility: "public" | "private";
  };
};

export function useMyRooms() {
  return useQuery({
    queryKey: ["me", "rooms"],
    queryFn: async () => {
      const res = await fetch("/api/me/rooms");
      if (!res.ok) throw new Error("my_rooms_failed");
      const json = (await res.json()) as { rooms: MyRoomRow[] };
      return json.rooms;
    },
  });
}
