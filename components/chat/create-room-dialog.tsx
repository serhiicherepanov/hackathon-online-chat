"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Visibility = "public" | "private";

export function CreateRoomDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (roomId: string) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setVisibility("public");
      setSubmitting(false);
    }
  }, [open]);

  async function createRoom() {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          description: description.trim() || undefined,
          visibility,
        }),
      });
      if (!res.ok) return;
      const json = (await res.json()) as { room?: { id?: string } };
      const roomId = json.room?.id;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["rooms"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "rooms"] }),
      ]);
      onOpenChange(false);
      if (roomId) onCreated?.(roomId);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create room</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="create-room-name">Name</Label>
            <Input
              id="create-room-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-room-desc">Description (optional)</Label>
            <Input
              id="create-room-desc"
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
          <Button
            type="button"
            onClick={() => void createRoom()}
            disabled={submitting || !name.trim()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
