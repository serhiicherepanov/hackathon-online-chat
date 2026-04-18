"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
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

  async function createRoom() {
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: description || undefined,
        visibility: "public",
      }),
    });
    if (!res.ok) return;
    setOpen(false);
    setName("");
    setDescription("");
    await queryClient.invalidateQueries({ queryKey: ["rooms"] });
    await queryClient.invalidateQueries({ queryKey: ["me", "rooms"] });
  }

  const rows = useMemo(() => catalog.data ?? [], [catalog.data]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Public rooms</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Create room</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a public room</DialogTitle>
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
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3"
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
