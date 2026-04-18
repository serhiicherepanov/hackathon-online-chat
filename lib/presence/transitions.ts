const lastOnline = new Map<string, boolean>();

export function consumePresenceTransition(
  userId: string,
  online: boolean,
): boolean {
  const prev = lastOnline.get(userId);
  if (prev === online) return false;
  lastOnline.set(userId, online);
  return true;
}

export function peekPresenceOnline(userId: string): boolean | undefined {
  return lastOnline.get(userId);
}
