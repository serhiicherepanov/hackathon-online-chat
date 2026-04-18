import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FriendsSnapshotDto } from "@/lib/social/serialize";

async function jsonPost(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "request_failed" }));
    throw new Error((err as { error?: string }).error ?? "request_failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

async function jsonDelete(url: string) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "request_failed" }));
    throw new Error((err as { error?: string }).error ?? "request_failed");
  }
  return null;
}

export function useContacts() {
  return useQuery<FriendsSnapshotDto>({
    queryKey: ["me", "friends"],
    queryFn: async () => {
      const res = await fetch("/api/friends");
      if (!res.ok) throw new Error("friends_failed");
      return (await res.json()) as FriendsSnapshotDto;
    },
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (identifier: string) =>
      jsonPost("/api/friends/requests", { identifier }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me", "friends"] }),
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) =>
      jsonPost(`/api/friends/requests/${friendshipId}/accept`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me", "friends"] }),
  });
}

export function useDeclineFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) =>
      jsonPost(`/api/friends/requests/${friendshipId}/decline`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me", "friends"] }),
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => jsonDelete(`/api/friends/${userId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["me", "friends"] }),
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => jsonPost("/api/blocks", { userId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me", "friends"] });
      void qc.invalidateQueries({ queryKey: ["me", "dm-contacts"] });
    },
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => jsonDelete(`/api/blocks/${userId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me", "friends"] });
      void qc.invalidateQueries({ queryKey: ["me", "dm-contacts"] });
    },
  });
}
