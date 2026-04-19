import type { PresenceStatus } from "@/lib/realtime/payloads";

export const GENERATED_AVATAR_VARIANT = "marble";

export const GENERATED_AVATAR_COLORS = [
  "#5B8DEF",
  "#F4A259",
  "#8CB369",
  "#BC4749",
  "#6A4C93",
] as const;

export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  online: "Online",
  afk: "Away",
  offline: "Offline",
};

export function getUserAvatarSeed(userId: string): string {
  return `user:${userId}`;
}

export function getRoomAvatarSeed(roomId: string): string {
  return `room:${roomId}`;
}
