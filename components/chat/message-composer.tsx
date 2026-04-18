"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MessageComposer({
  conversationId,
  onSent,
}: {
  conversationId: string;
  onSent?: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      if (res.status === 413) {
        setError("Message is too large (max 3 KB).");
        return;
      }
      if (!res.ok) {
        setError("Could not send message.");
        return;
      }
      setText("");
      onSent?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="border-t border-border p-3">
      {error ? (
        <p className="mb-2 text-sm text-destructive">{error}</p>
      ) : null}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Message"
          autoComplete="off"
        />
        <Button type="submit" disabled={sending}>
          Send
        </Button>
      </form>
    </div>
  );
}
