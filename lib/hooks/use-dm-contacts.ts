import { useQuery } from "@tanstack/react-query";

export type DmContactRow = {
  conversationId: string;
  peer: { id: string; username: string };
};

export function useMyDmContacts() {
  return useQuery({
    queryKey: ["me", "dm-contacts"],
    queryFn: async () => {
      const res = await fetch("/api/me/dm-contacts");
      if (!res.ok) throw new Error("dm_contacts_failed");
      const json = (await res.json()) as { contacts: DmContactRow[] };
      return json.contacts;
    },
  });
}
