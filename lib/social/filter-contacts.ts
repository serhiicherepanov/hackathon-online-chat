export function matchesContactQuery(username: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return username.toLowerCase().includes(q);
}

export function filterByPeerUsername<T extends { peer: { username: string } }>(
  items: readonly T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice();
  return items.filter((item) => item.peer.username.toLowerCase().includes(q));
}
