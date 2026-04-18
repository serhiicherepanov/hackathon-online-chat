import { useQuery } from "@tanstack/react-query";

export type MemberRow = {
  userId: string;
  username: string;
  role: "owner" | "member";
  joinedAt: string;
};

export function useMembers(roomId: string | undefined) {
  return useQuery({
    queryKey: ["rooms", roomId, "members"],
    enabled: Boolean(roomId),
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/members`);
      if (!res.ok) throw new Error("members_failed");
      const json = (await res.json()) as { members: MemberRow[] };
      return json.members;
    },
  });
}
