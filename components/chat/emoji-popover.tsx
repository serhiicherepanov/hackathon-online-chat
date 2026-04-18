"use client";

import { useEffect, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

type Props = { onPick: (emoji: string) => void };

export function EmojiPopover({ onPick }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void import("emoji-picker-element");
  }, []);

  useEffect(() => {
    if (!open) return;
    const host = hostRef.current;
    if (!host) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        unicode?: string;
        emoji?: { unicode?: string };
      };
      const u = detail?.unicode ?? detail?.emoji?.unicode;
      if (u) onPick(u);
    };
    host.addEventListener("emoji-click", handler as EventListener);
    return () =>
      host.removeEventListener("emoji-click", handler as EventListener);
  }, [onPick, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Insert emoji"
          data-testid="composer-emoji-btn"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div ref={hostRef} dangerouslySetInnerHTML={{ __html: "<emoji-picker></emoji-picker>" }} />
      </PopoverContent>
    </Popover>
  );
}
