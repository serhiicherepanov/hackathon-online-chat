"use client";

import { useMyDmContacts } from "@/lib/hooks/use-dm-contacts";

/**
 * Derives the frozen state for a single DM conversation from the cached
 * contacts snapshot. The snapshot is invalidated automatically by the
 * centrifuge provider on `block.created` / `block.removed` / `dm.frozen`
 * events, so this hook reacts to realtime changes without its own fetch.
 */
export function useDmFrozen(conversationId: string | undefined): {
  frozen: boolean;
  loading: boolean;
} {
  const dms = useMyDmContacts();
  if (!conversationId) return { frozen: false, loading: dms.isPending };
  const row = dms.data?.find((c) => c.conversationId === conversationId);
  return { frozen: Boolean(row?.frozen), loading: dms.isPending };
}
