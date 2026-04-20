"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AuthUserDto, SessionSummaryDto } from "@/lib/auth/serialize";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NotificationsSettingsCard } from "@/components/settings/notifications-card";

const DELETE_ACCOUNT_CONFIRMATION = "DELETE MY ACCOUNT";

function LoadingCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Loading…
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const myRooms = useMyRooms();

  const me = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("me_failed");
      const json = (await res.json()) as { user: AuthUserDto };
      return json.user;
    },
  });

  const sessions = useQuery({
    queryKey: ["me", "sessions"],
    queryFn: async () => {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error("sessions_failed");
      const json = (await res.json()) as { sessions: SessionSummaryDto[] };
      return json.sessions;
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [sessionBusyId, setSessionBusyId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [deleteUsername, setDeleteUsername] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!me.data) return;
    setDisplayName(me.data.displayName ?? "");
    setAvatarUrl(me.data.avatarUrl ?? "");
    setDeleteUsername(me.data.username);
  }, [me.data?.avatarUrl, me.data?.displayName, me.data?.username]);

  const ownedRooms = useMemo(
    () => (myRooms.data ?? []).filter((room) => room.role === "owner"),
    [myRooms.data],
  );

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim() || null,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        setProfileError("Could not save your profile.");
        return;
      }

      const json = (await res.json()) as { user: AuthUserDto };
      queryClient.setQueryData(["me"], json.user);
      setProfileMessage("Profile updated.");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordBusy(true);
    setPasswordError(null);
    setPasswordMessage(null);

    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 400) {
        setPasswordError("Check your current password and try again.");
        return;
      }
      if (!res.ok) {
        setPasswordError("Could not change your password.");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage("Password changed.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function revokeSession(session: SessionSummaryDto) {
    setSessionBusyId(session.id);
    setSessionError(null);

    try {
      const res = await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
      if (!res.ok) {
        setSessionError("Could not revoke that session.");
        return;
      }

      if (session.current) {
        queryClient.setQueryData(["me"], null);
        router.push("/sign-in");
        router.refresh();
        return;
      }

      await sessions.refetch();
    } finally {
      setSessionBusyId(null);
    }
  }

  async function submitDeleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setDeleteBusy(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: deleteUsername,
          confirmation: deleteConfirmation,
        }),
      });

      if (!res.ok) {
        setDeleteError("Confirmation did not match. The account was not deleted.");
        return;
      }

      queryClient.setQueryData(["me"], null);
      router.push("/sign-in");
      router.refresh();
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your profile, password, active browser sessions, and account.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {me.isPending ? (
          <LoadingCard
            title="Profile"
            description="Update the display details shown around the app."
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>
                Your username stays fixed. Display name and avatar URL can change.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={(e) => void saveProfile(e)}>
                {profileError ? (
                  <p className="text-sm text-destructive">{profileError}</p>
                ) : null}
                {profileMessage ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {profileMessage}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    value={me.data?.email ?? ""}
                    disabled
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-username">Username</Label>
                  <Input
                    id="settings-username"
                    value={me.data?.username ?? ""}
                    disabled
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-display-name">Display name</Label>
                  <Input
                    id="settings-display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Shown next to your messages"
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-avatar-url">Avatar URL</Label>
                  <Input
                    id="settings-avatar-url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://example.com/avatar.png"
                    type="url"
                  />
                </div>
                <Button disabled={profileBusy} type="submit">
                  Save profile
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>
              Change the password for this account without signing out other browsers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => void changePassword(e)}>
              {passwordError ? (
                <p className="text-sm text-destructive">{passwordError}</p>
              ) : null}
              {passwordMessage ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  {passwordMessage}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="settings-current-password">Current password</Label>
                <Input
                  id="settings-current-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-new-password">New password</Label>
                <Input
                  id="settings-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <Button disabled={passwordBusy} type="submit">
                Change password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <NotificationsSettingsCard />

      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>
            Review the browsers that are still signed in and revoke any one of them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionError ? <p className="text-sm text-destructive">{sessionError}</p> : null}
          {sessions.isPending ? (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              Loading your active sessions…
            </div>
          ) : sessions.data?.length ? (
            <div className="space-y-3">
              {sessions.data.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                  data-testid={`session-row-${session.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{session.browserLabel}</p>
                      {session.current ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                          Current
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Last seen {new Date(session.lastSeenAt).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {session.ip ? `IP ${session.ip}` : "IP unavailable"}
                    </p>
                  </div>
                  <Button
                    variant={session.current ? "destructive" : "outline"}
                    disabled={sessionBusyId === session.id}
                    onClick={() => void revokeSession(session)}
                    data-testid={`session-revoke-${session.id}`}
                  >
                    {session.current ? "Sign out this browser" : "Revoke session"}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No active sessions were returned for this account.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
          <CardDescription>
            This permanently deletes rooms you own, removes your memberships elsewhere,
            revokes all sessions, and keeps messages in surviving conversations under a
            deleted-user label.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">Before you continue</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Owned rooms deleted:{" "}
                {myRooms.isPending
                  ? "checking…"
                  : ownedRooms.length === 0
                    ? "none"
                    : `${ownedRooms.length} room${ownedRooms.length === 1 ? "" : "s"}`}
              </li>
              <li>All browser sessions for this account end immediately.</li>
              <li>
                Messages in rooms or DMs that survive will stay visible but will be
                anonymized.
              </li>
            </ul>
          </div>

          <form className="space-y-4" onSubmit={(e) => void submitDeleteAccount(e)}>
            {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="delete-username">Type your username</Label>
              <Input
                id="delete-username"
                value={deleteUsername}
                onChange={(e) => setDeleteUsername(e.target.value)}
                autoComplete="off"
                data-testid="delete-account-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Type <span className="font-semibold">{DELETE_ACCOUNT_CONFIRMATION}</span>
              </Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                autoComplete="off"
                data-testid="delete-account-confirmation"
              />
            </div>
            <Button
              disabled={deleteBusy}
              type="submit"
              variant="destructive"
              data-testid="delete-account-submit"
            >
              Delete account permanently
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
