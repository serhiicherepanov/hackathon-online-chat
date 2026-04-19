"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMembers } from "@/lib/hooks/use-members";
import type { RoomInviteRow } from "@/lib/hooks/use-room-invites";
import type { RoomBanDto } from "@/lib/rooms/serialize";
import { useToastStore } from "@/lib/stores/toast-store";
import { cn } from "@/lib/utils";

type RoomRole = "owner" | "admin" | "member" | null;
type RoomVisibility = "public" | "private";
type ManageTab = "members" | "admins" | "banned" | "invitations" | "settings";

type RoomHeaderActionsProps = {
  roomId: string;
  roomName: string;
  roomDescription: string | null;
  roomVisibility: RoomVisibility;
  currentRole: RoomRole;
};

function errorMessage(error: string): string {
  switch (error) {
    case "duplicate_pending":
      return "That user already has a pending invite.";
    case "invitee_not_found":
      return "No user with that username was found.";
    case "already_member":
      return "That user is already in the room.";
    case "banned":
      return "That user is currently banned from the room.";
    case "room_is_public":
      return "Invites are only available for private rooms.";
    case "room_name_taken":
      return "That room name is already in use.";
    case "owner_protected":
      return "The room owner cannot be changed or removed.";
    case "validation_error":
      return "Check the form values and try again.";
    case "not_found":
      return "That room or user no longer exists.";
    case "owner_cannot_leave":
      return "Owners must delete the room instead of leaving it.";
    default:
      return "The action could not be completed.";
  }
}

async function getErrorCode(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: string };
    return typeof json.error === "string" ? json.error : `http_${res.status}`;
  } catch {
    return `http_${res.status}`;
  }
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      className={cn("shrink-0", active && "pointer-events-none")}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function RoomHeaderActions({
  roomId,
  roomName,
  roomDescription,
  roomVisibility,
  currentRole,
}: RoomHeaderActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const members = useMembers(roomId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ManageTab>("members");
  const [inviteUsername, setInviteUsername] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [settingsName, setSettingsName] = useState(roomName);
  const [settingsDescription, setSettingsDescription] = useState(roomDescription ?? "");
  const [settingsVisibility, setSettingsVisibility] =
    useState<RoomVisibility>(roomVisibility);

  const canManage = currentRole === "owner" || currentRole === "admin";
  const isOwner = currentRole === "owner";
  const canLeave = currentRole === "member" || currentRole === "admin";

  useEffect(() => {
    setSettingsName(roomName);
    setSettingsDescription(roomDescription ?? "");
    setSettingsVisibility(roomVisibility);
  }, [roomDescription, roomName, roomVisibility]);

  const roomInvites = useQuery({
    queryKey: ["rooms", roomId, "invites"],
    enabled: canManage && dialogOpen,
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/invites`);
      if (!res.ok) throw new Error("room_invites_failed");
      const json = (await res.json()) as { invites: RoomInviteRow[] };
      return json.invites;
    },
  });

  const roomBans = useQuery({
    queryKey: ["rooms", roomId, "bans"],
    enabled: canManage && dialogOpen,
    queryFn: async () => {
      const res = await fetch(`/api/rooms/${roomId}/bans`);
      if (!res.ok) throw new Error("room_bans_failed");
      const json = (await res.json()) as { bans: RoomBanDto[] };
      return json.bans;
    },
  });

  const admins = useMemo(
    () => (members.data ?? []).filter((member) => member.role === "owner" || member.role === "admin"),
    [members.data],
  );

  async function refreshRoomQueries() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["rooms"] }),
      queryClient.invalidateQueries({ queryKey: ["me", "rooms"] }),
      queryClient.invalidateQueries({ queryKey: ["me", "invites"] }),
      queryClient.invalidateQueries({ queryKey: ["rooms", roomId, "meta"] }),
      queryClient.invalidateQueries({ queryKey: ["rooms", roomId, "members"] }),
      queryClient.invalidateQueries({ queryKey: ["rooms", roomId, "invites"] }),
      queryClient.invalidateQueries({ queryKey: ["rooms", roomId, "bans"] }),
    ]);
  }

  function notify(title: string, description?: string) {
    pushToast({
      id: `${title}-${Date.now()}`,
      title,
      description,
    });
  }

  function openManage(tab: ManageTab) {
    setActiveTab(tab);
    setDialogOpen(true);
  }

  async function mutate(actionKey: string, run: () => Promise<void>) {
    setBusyAction(actionKey);
    try {
      await run();
    } finally {
      setBusyAction(null);
    }
  }

  async function inviteUser() {
    await mutate("invite", async () => {
      const username = inviteUsername.trim();
      if (!username) return;
      const res = await fetch(`/api/rooms/${roomId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        notify("Invite failed", errorMessage(await getErrorCode(res)));
        return;
      }
      setInviteUsername("");
      await refreshRoomQueries();
      notify("Invite sent", `An invite was sent to ${username}.`);
    });
  }

  async function promoteToAdmin(userId: string) {
    await mutate(`promote-${userId}`, async () => {
      const res = await fetch(`/api/rooms/${roomId}/admins/${userId}`, {
        method: "POST",
      });
      if (!res.ok) {
        notify("Could not promote member", errorMessage(await getErrorCode(res)));
        return;
      }
      await refreshRoomQueries();
      notify("Admin updated", "The member is now an admin.");
    });
  }

  async function revokeAdmin(userId: string) {
    await mutate(`revoke-${userId}`, async () => {
      const res = await fetch(`/api/rooms/${roomId}/admins/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        notify("Could not revoke admin", errorMessage(await getErrorCode(res)));
        return;
      }
      await refreshRoomQueries();
      notify("Admin updated", "The member is now a regular member.");
    });
  }

  async function removeMember(userId: string) {
    if (
      !window.confirm(
        "Remove this user from the room? They can join again later if they are invited or rejoin a public room.",
      )
    ) {
      return;
    }
    await mutate(`remove-${userId}`, async () => {
      const res = await fetch(`/api/rooms/${roomId}/members/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        notify("Could not remove member", errorMessage(await getErrorCode(res)));
        return;
      }
      await refreshRoomQueries();
      notify("Member removed", "The user was removed from the room and can rejoin later.");
    });
  }

  async function banMember(userId: string) {
    if (
      !window.confirm(
        "Ban this user from the room? They will lose access immediately and cannot rejoin until you unban them.",
      )
    ) {
      return;
    }
    await mutate(`ban-${userId}`, async () => {
      const res = await fetch(`/api/rooms/${roomId}/bans/${userId}`, {
        method: "POST",
      });
      if (!res.ok) {
        notify("Could not ban member", errorMessage(await getErrorCode(res)));
        return;
      }
      await refreshRoomQueries();
      notify("Member banned", "The user was banned and cannot rejoin until unbanned.");
    });
  }

  async function unbanMember(userId: string) {
    await mutate(`unban-${userId}`, async () => {
      const res = await fetch(`/api/rooms/${roomId}/bans/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        notify("Could not unban user", errorMessage(await getErrorCode(res)));
        return;
      }
      await refreshRoomQueries();
      notify("User unbanned", "The user can join the room again.");
    });
  }

  async function saveSettings() {
    await mutate("save-settings", async () => {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: settingsName,
          description: settingsDescription || undefined,
          visibility: settingsVisibility,
        }),
      });
      if (!res.ok) {
        notify("Could not save room", errorMessage(await getErrorCode(res)));
        return;
      }
      await refreshRoomQueries();
      notify("Room updated", "Room settings were saved.");
    });
  }

  async function leaveRoom() {
    if (!window.confirm(`Leave ${roomName}?`)) return;
    await mutate("leave-room", async () => {
      const res = await fetch(`/api/rooms/${roomId}/leave`, {
        method: "POST",
      });
      if (!res.ok) {
        notify("Could not leave room", errorMessage(await getErrorCode(res)));
        return;
      }
      await refreshRoomQueries();
      notify("Left room", `${roomName} was removed from your sidebar.`);
      router.replace("/rooms");
    });
  }

  async function deleteRoom() {
    if (!window.confirm(`Delete ${roomName}? This cannot be undone.`)) return;
    await mutate("delete-room", async () => {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        notify("Could not delete room", errorMessage(await getErrorCode(res)));
        return;
      }
      setDialogOpen(false);
      await refreshRoomQueries();
      notify("Room deleted", `${roomName} was deleted.`);
      router.replace("/rooms");
    });
  }

  if (!currentRole) {
    return null;
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" data-testid="room-actions-trigger">
            Room actions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canManage ? (
            <DropdownMenuItem onClick={() => openManage("invitations")}>
              Invite user
            </DropdownMenuItem>
          ) : null}
          {canManage ? (
            <DropdownMenuItem onClick={() => openManage("members")}>
              Manage room
            </DropdownMenuItem>
          ) : null}
          {canLeave ? (
            <DropdownMenuItem onClick={() => void leaveRoom()}>
              Leave room
            </DropdownMenuItem>
          ) : null}
          {isOwner ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => void deleteRoom()}
            >
              Delete room
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage room</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2" data-testid="manage-room-tabs">
          <TabButton active={activeTab === "members"} onClick={() => setActiveTab("members")}>
            Members
          </TabButton>
          <TabButton active={activeTab === "admins"} onClick={() => setActiveTab("admins")}>
            Admins
          </TabButton>
          <TabButton active={activeTab === "banned"} onClick={() => setActiveTab("banned")}>
            Banned
          </TabButton>
          <TabButton
            active={activeTab === "invitations"}
            onClick={() => setActiveTab("invitations")}
          >
            Invitations
          </TabButton>
          {isOwner ? (
            <TabButton active={activeTab === "settings"} onClick={() => setActiveTab("settings")}>
              Settings
            </TabButton>
          ) : null}
        </div>

        <ScrollArea className="max-h-[60vh] pr-4">
          {activeTab === "members" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Remove members when they should be able to come back later, or ban them
                when rejoin should stay blocked until an unban.
              </p>
              {members.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading members…</p>
              ) : members.data?.length ? (
                members.data.map((member) => (
                  <div
                    key={member.userId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                    data-testid={`manage-member-${member.username}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{member.username}</span>
                        <Badge variant="secondary">{member.role}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.joinedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isOwner && member.role === "member" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyAction === `promote-${member.userId}`}
                          onClick={() => void promoteToAdmin(member.userId)}
                        >
                          Make admin
                        </Button>
                      ) : null}
                      {member.role !== "owner" ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyAction === `remove-${member.userId}`}
                            onClick={() => void removeMember(member.userId)}
                          >
                            Remove
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={busyAction === `ban-${member.userId}`}
                            onClick={() => void banMember(member.userId)}
                          >
                            Ban
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No members found.</p>
              )}
            </div>
          ) : null}

          {activeTab === "admins" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Owners can grant or revoke admin access. Admins can review the current
                moderation team here.
              </p>
              {admins.length ? (
                admins.map((member) => (
                  <div
                    key={member.userId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                    data-testid={`manage-admin-${member.username}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{member.username}</span>
                      <Badge variant="secondary">{member.role}</Badge>
                    </div>
                    {isOwner && member.role === "admin" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busyAction === `revoke-${member.userId}`}
                        onClick={() => void revokeAdmin(member.userId)}
                      >
                        Revoke admin
                      </Button>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No admins found.</p>
              )}
            </div>
          ) : null}

          {activeTab === "banned" ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Banned users lose room access immediately and must be unbanned before
                they can return.
              </p>
              {roomBans.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading bans…</p>
              ) : roomBans.data?.length ? (
                roomBans.data.map((ban) => (
                  <div
                    key={ban.userId}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                    data-testid={`manage-ban-${ban.username}`}
                  >
                    <div className="space-y-1">
                      <div className="font-medium">{ban.username}</div>
                      <p className="text-xs text-muted-foreground">
                        Banned by {ban.bannedBy.username}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busyAction === `unban-${ban.userId}`}
                      onClick={() => void unbanMember(ban.userId)}
                    >
                      Unban
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No banned users.</p>
              )}
            </div>
          ) : null}

          {activeTab === "invitations" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-invite-username">Invite by username</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    id="room-invite-username"
                    value={inviteUsername}
                    onChange={(event) => setInviteUsername(event.target.value)}
                    placeholder="username"
                    disabled={roomVisibility !== "private"}
                  />
                  <Button
                    type="button"
                    disabled={busyAction === "invite" || roomVisibility !== "private"}
                    onClick={() => void inviteUser()}
                  >
                    Send invite
                  </Button>
                </div>
                {roomVisibility !== "private" ? (
                  <p className="text-sm text-muted-foreground">
                    Invites are available for private rooms only.
                  </p>
                ) : null}
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Pending invites</p>
                {roomInvites.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading invites…</p>
                ) : roomInvites.data?.length ? (
                  roomInvites.data.map((invite) => (
                    <div
                      key={invite.id}
                      className="rounded-md border p-3"
                      data-testid={`manage-invite-${invite.invitee.username}`}
                    >
                      <div className="font-medium">{invite.invitee.username}</div>
                      <p className="text-xs text-muted-foreground">
                        Invited by {invite.inviter.username}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No pending invites.</p>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "settings" && isOwner ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="room-settings-name">Room name</Label>
                <Input
                  id="room-settings-name"
                  value={settingsName}
                  onChange={(event) => setSettingsName(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-settings-description">Description</Label>
                <textarea
                  id="room-settings-description"
                  className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={settingsDescription}
                  onChange={(event) => setSettingsDescription(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="room-settings-visibility">Visibility</Label>
                <select
                  id="room-settings-visibility"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={settingsVisibility}
                  onChange={(event) =>
                    setSettingsVisibility(event.target.value as RoomVisibility)
                  }
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  type="button"
                  disabled={busyAction === "save-settings"}
                  onClick={() => void saveSettings()}
                >
                  Save settings
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={busyAction === "delete-room"}
                  onClick={() => void deleteRoom()}
                >
                  Delete room
                </Button>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
