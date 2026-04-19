"use client";

import {
  Download,
  Image as ImageIcon,
  MoreHorizontal,
  Pencil,
  Reply,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/chat/user-avatar";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useComposerStore } from "@/lib/stores/composer-store";
import { useMessageInteractionStore } from "@/lib/stores/message-interaction-store";
import { cn } from "@/lib/utils";
import type { AttachmentDto, MessageDto } from "@/lib/types/chat";

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function ImageAttachment({ a }: { a: AttachmentDto }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Open ${a.originalName}`}
        onClick={() => setOpen(true)}
        className="block overflow-hidden rounded border"
        data-testid="att-image-thumb"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/files/${a.id}`}
          alt={a.originalName}
          className="max-h-48 max-w-xs object-cover"
        />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{a.originalName}</DialogTitle>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/${a.id}`}
            alt={a.originalName}
            className="max-h-[70vh] w-full object-contain"
          />
          <a
            href={`/api/files/${a.id}`}
            download={a.originalName}
            className="inline-flex items-center gap-1 self-start text-sm text-primary underline"
          >
            <Download className="h-4 w-4" /> Download
          </a>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FileChip({ a }: { a: AttachmentDto }) {
  return (
    <a
      href={`/api/files/${a.id}`}
      download={a.originalName}
      className="inline-flex items-center gap-2 rounded border bg-muted px-2 py-1 text-xs hover:bg-accent"
      data-testid="att-file-chip"
    >
      <ImageIcon className="h-3 w-3" />
      <span className="max-w-[200px] truncate">{a.originalName}</span>
      <span className="text-muted-foreground">{formatSize(a.size)}</span>
      <Download className="h-3 w-3" />
    </a>
  );
}

export function MessageItem({
  message,
  onScrollToReply,
}: {
  message: MessageDto;
  onScrollToReply?: (id: string) => void;
}) {
  const me = useAuthStore((s) => s.user);
  const setReply = useComposerStore((s) => s.setReplyTarget);
  const editRequestId = useMessageInteractionStore((s) => s.editRequestId);
  const clearEditRequest = useMessageInteractionStore(
    (s) => s.clearEditRequest,
  );
  const flashMessageId = useMessageInteractionStore((s) => s.flashMessageId);
  const flashNonce = useMessageInteractionStore((s) => s.flashNonce);
  const clearFlash = useMessageInteractionStore((s) => s.clearFlash);

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.body ?? "");
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const editRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const isAuthor = me?.id === message.authorId;
  const deleted = message.deleted;
  const bubbleClass = isAuthor ? "chat-bubble-sent" : "chat-bubble-received";

  useEffect(() => {
    if (editRequestId !== message.id) return;
    if (deleted || !isAuthor) {
      clearEditRequest();
      return;
    }
    setEditText(message.body ?? "");
    setEditing(true);
    clearEditRequest();
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    });
  }, [
    clearEditRequest,
    deleted,
    editRequestId,
    isAuthor,
    message.body,
    message.id,
  ]);

  useEffect(() => {
    if (flashMessageId !== message.id) return;
    setIsFlashing(true);
    const handle = window.setTimeout(() => {
      setIsFlashing(false);
      clearFlash();
    }, 1000);
    return () => window.clearTimeout(handle);
  }, [clearFlash, flashMessageId, flashNonce, message.id]);

  const saveEdit = useCallback(async () => {
    setEditError(null);
    const res = await fetch(`/api/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: editText }),
    });
    if (res.status === 400) {
      setEditError("Nothing to save.");
      return;
    }
    if (!res.ok) {
      setEditError("Edit failed.");
      return;
    }
    setEditing(false);
  }, [editText, message.id]);

  const confirmDelete = useCallback(async () => {
    setConfirmOpen(false);
    await fetch(`/api/messages/${message.id}`, { method: "DELETE" });
  }, [message.id]);

  const startReply = useCallback(() => {
    setReply(message.conversationId, {
      id: message.id,
      authorUsername: message.author.username,
      bodyPreview: (message.body ?? "").slice(0, 140),
    });
  }, [
    message.author.username,
    message.body,
    message.conversationId,
    message.id,
    setReply,
  ]);

  const startEdit = useCallback(() => {
    setEditText(message.body ?? "");
    setEditing(true);
  }, [message.body]);

  return (
    <div
      ref={rootRef}
      className={cn(
        "group/message mx-3 my-2 rounded-xl px-4 py-3 shadow-sm transition-all hover:shadow-md focus-within:shadow-md",
        bubbleClass,
        isFlashing && "message-flash",
      )}
      data-testid="message-item"
      data-message-id={message.id}
      data-flashing={isFlashing ? "true" : "false"}
      tabIndex={-1}
    >
      <div className="flex items-start gap-3">
        <UserAvatar
          userId={message.authorId}
          username={message.author.username}
          size={32}
          className="mt-0.5"
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 text-xs">
            <span
              className="font-semibold text-foreground"
              data-testid="message-author"
            >
              {message.author.username}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(message.createdAt).toLocaleString()}
            </span>
            {message.editedAt && !deleted ? (
              <span
                className="text-[10px] italic text-muted-foreground"
                data-testid="edited-badge"
              >
                (edited)
              </span>
            ) : null}
          </div>

          {message.replyTo ? (
            <button
              type="button"
              onClick={() => onScrollToReply?.(message.replyTo!.id)}
              className="mt-1 block max-w-full rounded border-l-2 border-primary/50 bg-muted/40 px-2 py-1 text-left text-xs hover:bg-muted"
              data-testid="reply-quote"
            >
              {message.replyTo.deleted ? (
                <span className="italic text-muted-foreground">[deleted]</span>
              ) : (
                <>
                  <span className="font-medium">
                    {message.replyTo.authorUsername}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    {message.replyTo.bodyPreview ?? ""}
                  </span>
                </>
              )}
            </button>
          ) : null}

          {deleted ? (
            <div
              className="text-sm italic text-muted-foreground"
              data-testid="message-deleted"
            >
              [deleted message]
            </div>
          ) : editing ? (
            <div className="mt-1">
              <TextareaAutosize
                ref={editRef}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void saveEdit();
                  } else if (e.key === "Escape") {
                    setEditing(false);
                    setEditText(message.body ?? "");
                  }
                }}
                minRows={1}
                maxRows={8}
                className="w-full resize-none rounded border border-input bg-background px-2 py-1 text-sm"
                data-testid="message-edit-input"
                autoFocus
              />
              {editError ? (
                <p className="text-xs text-destructive">{editError}</p>
              ) : null}
            </div>
          ) : (
            <div className="whitespace-pre-wrap break-words text-sm">
              {message.body}
            </div>
          )}

          {!deleted && message.attachments.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {message.attachments.map((a) =>
                a.kind === "image" ? (
                  <ImageAttachment key={a.id} a={a} />
                ) : (
                  <FileChip key={a.id} a={a} />
                ),
              )}
            </div>
          ) : null}
        </div>

        {!deleted ? (
          <div
            className="ml-auto flex shrink-0 items-center gap-0.5 self-start rounded-md border border-border/60 bg-card/95 p-0.5 opacity-0 shadow-sm transition-opacity group-hover/message:opacity-100 group-focus-within/message:opacity-100 focus-within:opacity-100"
            data-testid="message-actions"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Reply"
              data-testid="reply-action-inline"
              onClick={startReply}
              className="h-7 w-7"
            >
              <Reply className="h-4 w-4" />
            </Button>
            {isAuthor ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Edit"
                data-testid="edit-action-inline"
                onClick={startEdit}
                className="h-7 w-7"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Message actions"
                  data-testid="message-actions-btn"
                  className="h-7 w-7"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={startReply}
                  data-testid="reply-action"
                >
                  <Reply className="mr-2 h-4 w-4" /> Reply
                </DropdownMenuItem>
                {isAuthor ? (
                  <>
                    <DropdownMenuItem
                      onClick={startEdit}
                      data-testid="edit-action"
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setConfirmOpen(true)}
                      data-testid="delete-action"
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this message?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The message will be removed for everyone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmDelete()}
              data-testid="delete-confirm"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
