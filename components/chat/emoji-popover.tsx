"use client";

import { createElement, useCallback, useEffect, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

type PickerModule = typeof import("emoji-picker-element");
type Props = {
  onPick: (emoji: string) => void;
  loadPickerModule?: () => Promise<PickerModule>;
};

type EmojiClickDetail = {
  unicode?: string;
  emoji?: { unicode?: string };
};

export function EmojiPopover({ onPick, loadPickerModule }: Props) {
  const [open, setOpen] = useState(false);
  const [pickerElement, setPickerNode] = useState<HTMLElement | null>(null);
  const [pickerReady, setPickerReady] = useState(false);
  const pickerModuleRef = useRef<Promise<PickerModule> | null>(null);

  const loadPickerModuleWithCache = () => {
    if (loadPickerModule) return loadPickerModule();
    pickerModuleRef.current ??= import("emoji-picker-element");
    return pickerModuleRef.current;
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    let disposed = false;

    void loadPickerModuleWithCache().then(() => {
      if (!disposed) {
        setPickerReady(true);
      }
    });

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    if (!open || !pickerReady || !pickerElement) return;

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<EmojiClickDetail>).detail;
      const unicode = detail?.unicode ?? detail?.emoji?.unicode;
      if (unicode) {
        onPick(unicode);
      }
    };

    pickerElement.addEventListener("emoji-click", handler as EventListener);
    return () => {
      pickerElement.removeEventListener("emoji-click", handler as EventListener);
    };
  }, [onPick, open, pickerElement, pickerReady]);

  const setPickerElement = useCallback((node: Element | null) => {
    setPickerNode(node as HTMLElement | null);
  }, []);

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
      <PopoverContent className="w-[22rem] p-0" align="end">
        <div className="min-h-[27rem]">
          {open && pickerReady
            ? createElement("emoji-picker", {
                ref: setPickerElement,
                "data-testid": "emoji-picker",
              })
            : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
