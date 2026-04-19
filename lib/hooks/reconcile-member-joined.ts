import type { MemberRow } from "@/lib/hooks/use-members";

export function reconcileMemberJoined(
  current: MemberRow[] | undefined,
  joined: MemberRow,
): MemberRow[] {
  const list = current ?? [];
  const existingIndex = list.findIndex((row) => row.userId === joined.userId);
  if (existingIndex >= 0) {
    const next = list.slice();
    next[existingIndex] = joined;
    return next;
  }
  return [...list, joined];
}
