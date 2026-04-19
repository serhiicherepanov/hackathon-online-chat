"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QueryBoundary } from "@/components/errors/query-boundary";
import { RoomVisibilityIcon } from "@/components/chat/room-visibility-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMyRooms } from "@/lib/hooks/use-my-rooms";
import { useRoomCatalog } from "@/lib/hooks/use-room-catalog";

export default function RoomsCatalogPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const catalog = useRoomCatalog(debounced);
  const myRooms = useMyRooms();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");

  function resetCreateRoomForm() {
    setName("");
    setDescription("");
    setVisibility("public");
  }

  async function createRoom() {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        visibility,
      }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { room?: { id?: string } };
    const roomId = json.room?.id;
    if (!roomId) return;
    setOpen(false);
    resetCreateRoomForm();
    await queryClient.invalidateQueries({ queryKey: ["rooms"] });
    await queryClient.invalidateQueries({ queryKey: ["me", "rooms"] });
    router.push(`/rooms/${roomId}`);
  }

  const rows = useMemo(() => catalog.data ?? [], [catalog.data]);

  const privateRooms = useMemo(() => {
    const all = myRooms.data ?? [];
    const needle = debounced.trim().toLowerCase();
    return all
      .filter((entry) => entry.room.visibility === "private")
      .filter((entry) => {
        if (!needle) return true;
        const hay = `${entry.room.name} ${entry.room.description ?? ""}`.toLowerCase();
        return hay.includes(needle);
      });
  }, [debounced, myRooms.data]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-card/60 backdrop-blur-sm px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Rooms</h1>
          <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
              setOpen(nextOpen);
              if (!nextOpen) {
                resetCreateRoomForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">Create room</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create room</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="room-name">Name</Label>
                  <Input
                    id="room-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="room-desc">Description (optional)</Label>
                  <Input
                    id="room-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                        visibility === "public"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                      onClick={() => setVisibility("public")}
                      aria-pressed={visibility === "public"}
                    >
                      <div className="font-medium">Public</div>
                      <p className="mt-1 text-muted-foreground">
                        Listed in the room catalog so people can discover and join it.
                      </p>
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                        visibility === "private"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                      onClick={() => setVisibility("private")}
                      aria-pressed={visibility === "private"}
                    >
                      <div className="font-medium">Private</div>
                      <p className="mt-1 text-muted-foreground">
                        Hidden from the catalog. People join after you invite them.
                      </p>
                    </button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" onClick={() => void createRoom()}>
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-3 max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms…"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <QueryBoundary>
          <section
            className="space-y-2"
            aria-labelledby="private-rooms-heading"
            data-testid="private-rooms-section"
          >
            <h2
              id="private-rooms-heading"
              className="text-sm font-semibold text-muted-foreground"
            >
              My private rooms
            </h2>
            {myRooms.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : privateRooms.length === 0 ? (
              <p
                className="text-sm text-muted-foreground"
                data-testid="private-rooms-empty"
              >
                {debounced.trim()
                  ? "No private rooms match your search."
                  : "You have not joined any private rooms yet."}
              </p>
            ) : (
              privateRooms.map((entry) => (
                <Link
                  key={entry.room.id}
                  href={`/rooms/${entry.room.id}`}
                  data-testid={`private-room-row-${entry.room.id}`}
                  data-room-visibility={entry.room.visibility}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/80 p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <RoomVisibilityIcon
                      visibility={entry.room.visibility}
                      roomName={entry.room.name}
                      size={32}
                      testId={`private-room-icon-${entry.room.id}`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium">{entry.room.name}</p>
                        <Badge variant="secondary">Member</Badge>
                      </div>
                      {entry.room.description ? (
                        <p className="truncate text-sm text-muted-foreground">
                          {entry.room.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button asChild size="sm">
                    <span>Open</span>
                  </Button>
                </Link>
              ))
            )}
          </section>

          <div className="my-4 h-px bg-border/60" aria-hidden />

          <section
            className="space-y-2"
            aria-labelledby="public-rooms-heading"
            data-testid="public-rooms-section"
          >
            <h2
              id="public-rooms-heading"
              className="text-sm font-semibold text-muted-foreground"
            >
              Public rooms
            </h2>
            {catalog.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : null}
            {rows.map((r) => (
              <div
                key={r.id}
                data-testid="room-card"
                data-room-visibility={r.visibility}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/80 p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <RoomVisibilityIcon
                    visibility={r.visibility}
                    roomName={r.name}
                    size={32}
                    testId={`public-room-icon-${r.id}`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium">{r.name}</p>
                      {r.isMember ? <Badge variant="secondary">Member</Badge> : null}
                    </div>
                    {r.description ? (
                      <p className="text-sm text-muted-foreground">{r.description}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {r.memberCount} members
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {r.isMember ? (
                    <Button asChild size="sm">
                      <Link href={`/rooms/${r.id}`}>Open</Link>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const res = await fetch(`/api/rooms/${r.id}/join`, {
                          method: "POST",
                        });
                        if (!res.ok) return;
                        await queryClient.invalidateQueries({ queryKey: ["rooms"] });
                        await queryClient.invalidateQueries({ queryKey: ["me", "rooms"] });
                      }}
                    >
                      Join
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </section>
        </QueryBoundary>
      </div>
    </div>
  );
}
