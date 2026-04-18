import { useQuery } from "@tanstack/react-query";

export type RoomCatalogRow = {
  id: string;
  conversationId: string;
  name: string;
  description: string | null;
  visibility: "public" | "private";
  memberCount: number;
  isMember: boolean;
};

export function useRoomCatalog(search: string) {
  return useQuery({
    queryKey: ["rooms", search],
    queryFn: async () => {
      const url = new URL("/api/rooms", window.location.origin);
      if (search.trim()) url.searchParams.set("search", search.trim());
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("rooms_fetch_failed");
      const json = (await res.json()) as { rooms: RoomCatalogRow[] };
      return json.rooms;
    },
  });
}
