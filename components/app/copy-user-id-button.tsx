"use client";

import copyToClipboard from "copy-to-clipboard";
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CopyUserIdButtonProps = {
  userId: string;
  className?: string;
  visibleLength?: number;
  testId?: string;
};

export function CopyUserIdButton({
  userId,
  className,
  visibleLength = 8,
  testId = "copy-user-id-button",
}: CopyUserIdButtonProps) {
  const [copied, setCopied] = useState(false);
  const visibleValue = userId.slice(0, visibleLength);

  useEffect(() => {
    if (!copied) return;
    const handle = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(handle);
  }, [copied]);

  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      title={userId}
      aria-label={copied ? "User id copied" : `Copy user id ${userId}`}
      data-testid={testId}
      data-user-id={userId}
      onClick={() => {
        if (copyToClipboard(userId)) {
          setCopied(true);
        }
      }}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3" aria-hidden />
          <span>Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" aria-hidden />
          <span className="font-mono">#{visibleValue}</span>
        </>
      )}
    </button>
  );
}
