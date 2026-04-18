"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Paperclip, X } from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { Button } from "@/components/ui/button";
import { EmojiPopover } from "./emoji-popover";
import { useComposerStore } from "@/lib/stores/composer-store";
import type { ReplyTarget, StagedAttachment } from "@/lib/stores/composer-store";
import type { MessageDto } from "@/lib/types/chat";

const MAX_FILE = 20 * 1024 * 1024;
const MAX_IMAGE = 3 * 1024 * 1024;

const EMPTY_CONV_STATE: {
  replyTarget: ReplyTarget | null;
  staged: StagedAttachment[];
} = { replyTarget: null, staged: [] };

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const TYPING_PUBLISH_THROTTLE_MS = 1500;

export function MessageComposer({
  conversationId,
  onSent,
  disabled = false,
  disabledReason,
}: {
  conversationId: string;
  onSent?: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputId = useId();
  const lastTypingPublishRef = useRef(0);

  const publishTyping = useCallback(() => {
    if (disabled) return;
    const now = Date.now();
    if (now - lastTypingPublishRef.current < TYPING_PUBLISH_THROTTLE_MS) return;
    lastTypingPublishRef.current = now;
    void fetch(`/api/conversations/${conversationId}/typing`, {
      method: "POST",
    }).catch(() => undefined);
  }, [conversationId, disabled]);

  const convState = useComposerStore(
    (s) => s.byConv[conversationId] ?? EMPTY_CONV_STATE,
  );
  const addStaged = useComposerStore((s) => s.addStaged);
  const updateStaged = useComposerStore((s) => s.updateStaged);
  const removeStaged = useComposerStore((s) => s.removeStaged);
  const clearStaged = useComposerStore((s) => s.clearStaged);
  const clearReply = useComposerStore((s) => s.clearReplyTarget);
  const queryClient = useQueryClient();

  const uploadFile = useCallback(
    async (file: File) => {
      const isImage = file.type.startsWith("image/");
      const cap = isImage ? MAX_IMAGE : MAX_FILE;
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (file.size > cap) {
        addStaged(conversationId, {
          localId,
          state: "error",
          name: file.name,
          size: file.size,
          error: isImage ? "Image > 3 MB" : "File > 20 MB",
        });
        return;
      }
      addStaged(conversationId, {
        localId,
        state: "uploading",
        name: file.name,
        size: file.size,
        progress: 0,
      });
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/uploads", { method: "POST", body: form });
        if (res.status === 413) {
          updateStaged(conversationId, localId, {
            state: "error",
            error: "Too large",
          } as never);
          return;
        }
        if (!res.ok) {
          updateStaged(conversationId, localId, {
            state: "error",
            error: "Upload failed",
          } as never);
          return;
        }
        const json = (await res.json()) as {
          id: string;
          kind: "image" | "file";
          originalName: string;
          mime: string;
          size: number;
          comment: string | null;
        };
        updateStaged(conversationId, localId, {
          state: "uploaded",
          progress: 100,
          attachment: json,
        } as never);
      } catch {
        updateStaged(conversationId, localId, {
          state: "error",
          error: "Network error",
        } as never);
      }
    },
    [addStaged, conversationId, updateStaged],
  );

  const send = useCallback(async () => {
    if (sending) return;
    const trimmed = text.trim();
    const uploaded = convState.staged.filter(
      (s): s is Extract<typeof s, { state: "uploaded" }> =>
        s.state === "uploaded",
    );
    if (!trimmed && uploaded.length === 0) return;
    const stillUploading = convState.staged.some((s) => s.state === "uploading");
    if (stillUploading) {
      setError("Wait for uploads to finish.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: text,
            replyToId: convState.replyTarget?.id ?? null,
            attachmentIds: uploaded.map((u) => u.attachment.id),
          }),
        },
      );
      if (res.status === 413) {
        setError("Message is too large (max 3 KB).");
        return;
      }
      if (!res.ok) {
        setError("Could not send message.");
        return;
      }
      try {
        const { message } = (await res.json()) as { message: MessageDto };
        const key = ["conv", conversationId, "messages"];
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const o = old as {
            pages: { messages: MessageDto[]; nextCursor: string | null }[];
            pageParams: unknown[];
          };
          if (!o.pages?.length) return old;
          const first = o.pages[0];
          if (first.messages.some((m) => m.id === message.id)) return old;
          return {
            ...o,
            pages: [
              { ...first, messages: [message, ...first.messages] },
              ...o.pages.slice(1),
            ],
          };
        });
      } catch {
        /* ignore parse errors; live event will fill in */
      }
      setText("");
      clearStaged(conversationId);
      clearReply(conversationId);
      onSent?.();
    } finally {
      setSending(false);
    }
  }, [clearReply, clearStaged, conversationId, convState.replyTarget, convState.staged, onSent, queryClient, sending, text]);

  const insertAtCaret = useCallback((s: string) => {
    const el = textareaRef.current;
    if (!el) {
      setText((t) => t + s);
      return;
    }
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + s + el.value.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + s.length;
      el.setSelectionRange(pos, pos);
    });
  }, []);

  const onPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const f = item.getAsFile();
          if (f) {
            e.preventDefault();
            void uploadFile(f);
          }
        }
      }
    },
    [uploadFile],
  );

  if (disabled) {
    return (
      <div
        className="border-t border-border p-4 text-sm text-muted-foreground"
        data-testid="composer-root"
        data-disabled="true"
      >
        {disabledReason ?? "This conversation is read-only."}
      </div>
    );
  }

  return (
    <div className="border-t border-border p-3" data-testid="composer-root">
      {convState.replyTarget ? (
        <div
          className="mb-2 flex items-center justify-between rounded border bg-muted px-3 py-2 text-xs"
          data-testid="reply-banner"
        >
          <div className="truncate">
            Replying to <span className="font-medium">{convState.replyTarget.authorUsername}</span>:{" "}
            <span className="text-muted-foreground">{convState.replyTarget.bodyPreview}</span>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={() => clearReply(conversationId)}
            className="ml-2 rounded p-1 hover:bg-background"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}

      {convState.staged.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-2" data-testid="staged-list">
          {convState.staged.map((s) => (
            <div
              key={s.localId}
              className="flex items-center gap-2 rounded border bg-muted px-2 py-1 text-xs"
            >
              <span className="max-w-[160px] truncate">{s.name}</span>
              <span className="text-muted-foreground">{formatSize(s.size)}</span>
              {s.state === "uploading" ? (
                <span className="text-muted-foreground">…</span>
              ) : null}
              {s.state === "error" ? (
                <span className="text-destructive">{s.error}</span>
              ) : null}
              <button
                type="button"
                aria-label="Remove attachment"
                onClick={() => removeStaged(conversationId, s.localId)}
                className="rounded p-0.5 hover:bg-background"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            const list = e.target.files;
            if (!list) return;
            for (const f of Array.from(list)) void uploadFile(f);
            e.target.value = "";
          }}
          data-testid="composer-file-input"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach file"
          data-testid="composer-attach-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>
        <EmojiPopover onPick={insertAtCaret} />
        <TextareaAutosize
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (e.target.value.trim().length > 0) publishTyping();
          }}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            } else if (e.key === "Escape") {
              if (convState.replyTarget) clearReply(conversationId);
            }
          }}
          placeholder="Message"
          minRows={1}
          maxRows={8}
          className="flex min-h-[40px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          data-testid="composer-input"
        />
        <Button type="submit" disabled={sending} data-testid="composer-send-btn">
          Send
        </Button>
      </form>
    </div>
  );
}
