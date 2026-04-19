"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { QueryBoundary } from "@/components/errors/query-boundary";
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border bg-card/60 backdrop-blur-sm px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Public rooms</h1>
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
          <div className="space-y-2">
            {catalog.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : null}
            {rows.map((r) => (
              <div
                key={r.id}
                data-testid="room-card"
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/50 bg-card/80 p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
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
          </div>
        </QueryBoundary>
      </div>
    </div>
  );
}
