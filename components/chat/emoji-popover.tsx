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

type EmojiClickDetail = {
  unicode?: string;
  emoji?: { unicode?: string };
};

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

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      await import("emoji-picker-element");
      await customElements.whenDefined("emoji-picker");
      if (disposed) return;

      host.replaceChildren();
      const picker = document.createElement("emoji-picker");
      const handler = (e: Event) => {
        const detail = (e as CustomEvent<EmojiClickDetail>).detail;
        const unicode = detail?.unicode ?? detail?.emoji?.unicode;
        if (unicode) {
          onPick(unicode);
        }
      };

      picker.addEventListener("emoji-click", handler as EventListener);
      host.appendChild(picker);
      cleanup = () => {
        picker.removeEventListener("emoji-click", handler as EventListener);
        picker.remove();
      };
    })();

    return () => {
      disposed = true;
      cleanup?.();
      host.replaceChildren();
    };
  }, [onPick, open]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
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
        <div ref={hostRef} />
      </PopoverContent>
    </Popover>
  );
}
