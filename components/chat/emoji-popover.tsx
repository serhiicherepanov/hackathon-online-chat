"use client";

import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    // lazy import so SSR is happy
    void import("emoji-picker-element");
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const picker = host.querySelector("emoji-picker") as
      | (HTMLElement & { addEventListener: HTMLElement["addEventListener"] })
      | null;
    if (!picker) return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        unicode?: string;
        emoji?: { unicode?: string };
      };
      const u = detail?.unicode ?? detail?.emoji?.unicode;
      if (u) onPick(u);
    };
    picker.addEventListener("emoji-click", handler as EventListener);
    return () =>
      picker.removeEventListener("emoji-click", handler as EventListener);
  }, [onPick]);

  return (
    <Popover>
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
