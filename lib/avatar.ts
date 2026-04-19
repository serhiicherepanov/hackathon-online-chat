import type { PresenceStatus } from "@/lib/realtime/payloads";

export type GeneratedAvatarKind = "user" | "room";
export type GeneratedAvatarVariant = "beam" | "marble";

export const USER_GENERATED_AVATAR_VARIANT: GeneratedAvatarVariant = "beam";
export const ROOM_GENERATED_AVATAR_VARIANT: GeneratedAvatarVariant = "marble";

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

export function getGeneratedAvatarVariant(
  kind: GeneratedAvatarKind,
): GeneratedAvatarVariant {
  return kind === "user"
    ? USER_GENERATED_AVATAR_VARIANT
    : ROOM_GENERATED_AVATAR_VARIANT;
}
