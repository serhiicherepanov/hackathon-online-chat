import { useQueryClient } from "@tanstack/react-query";
import type { Centrifuge, Subscription } from "centrifuge";
import { useEffect } from "react";
import type { MessageDto } from "@/lib/types/chat";
import {
  memberBannedSchema,
  messageDeletedSchema,
  messageUpdatedSchema,
  roleChangedSchema,
} from "@/lib/realtime/payloads";
import type {
  MemberBannedPayload,
  MessageCreatedPayload,
  MessageDeletedPayload,
  MessageUpdatedPayload,
  RoleChangedPayload,
  RoomDeletedPayload,
  RoomUpdatedPayload,
} from "@/lib/realtime/payloads";

type Pages = { pages: { messages: MessageDto[]; nextCursor: string | null }[]; pageParams: unknown[] };

export function useLiveMessages(
  client: Centrifuge | null,
  conversationId: string | undefined,
  channel: string | undefined,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!client || !conversationId || !channel) return;

    let sub: Subscription;

    const existing = client.getSubscription(channel);
    if (existing) {
      sub = existing;
    } else {
      try {
        sub = client.newSubscription(channel);
      } catch {
        const again = client.getSubscription(channel);
        if (!again) return;
        sub = again;
      }
    }

    const key = ["conv", conversationId, "messages"];

    const onPublication = (ctx: { data: unknown }) => {
      const data = ctx.data as
        | MessageCreatedPayload
        | MessageUpdatedPayload
        | MessageDeletedPayload
        | RoleChangedPayload
        | MemberBannedPayload
        | RoomUpdatedPayload
        | RoomDeletedPayload
        | { type?: string };
      if (!data || typeof data !== "object") return;

      if (data.type === "message.created") {
        const incoming = (data as MessageCreatedPayload).message;
        if ((data as MessageCreatedPayload).conversationId !== conversationId) return;
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old || typeof old !== "object") {
            return {
              pages: [{ messages: [incoming as MessageDto], nextCursor: null }],
              pageParams: [undefined],
            } satisfies Pages;
          }
          const o = old as Pages;
          if (!o.pages?.length) {
            return {
              ...o,
              pages: [{ messages: [incoming as MessageDto], nextCursor: null }],
              pageParams: o.pageParams?.length ? o.pageParams : [undefined],
            };
          }
          const first = o.pages[0];
          if (first.messages.some((m) => m.id === incoming.id)) return old;
          return {
            ...o,
            pages: [
              { ...first, messages: [incoming as MessageDto, ...first.messages] },
              ...o.pages.slice(1),
            ],
          };
        });
        return;
      }

      if (data.type === "message.updated") {
        const parsed = messageUpdatedSchema.safeParse(data);
        if (!parsed.success) return;
        const m = (data as MessageUpdatedPayload).message;
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const o = old as Pages;
          return {
            ...o,
            pages: o.pages.map((p) => ({
              ...p,
              messages: p.messages.map((x) =>
                x.id === m.id ? (m as MessageDto) : x,
              ),
            })),
          };
        });
        return;
      }

      if (data.type === "message.deleted") {
        const parsed = messageDeletedSchema.safeParse(data);
        if (!parsed.success) return;
        const { id, deletedAt } = parsed.data;
        queryClient.setQueryData(key, (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const o = old as Pages;
          return {
            ...o,
            pages: o.pages.map((p) => ({
              ...p,
              messages: p.messages.map((x) =>
                x.id === id
                  ? {
                      ...x,
                      body: null,
                      attachments: [],
                      replyTo: x.replyTo
                        ? { ...x.replyTo, bodyPreview: null, deleted: x.replyTo.deleted }
                        : null,
                      deleted: true,
                      deletedAt,
                    }
                  : x,
              ),
            })),
          };
        });
        return;
      }

      if (data.type === "role.changed") {
        const parsed = roleChangedSchema.safeParse(data);
        if (!parsed.success) return;
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["rooms", parsed.data.roomId, "members"],
          }),
          queryClient.invalidateQueries({ queryKey: ["me", "rooms"] }),
        ]);
        return;
      }

      if (data.type === "member.banned") {
        const parsed = memberBannedSchema.safeParse(data);
        if (!parsed.success) return;
        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["rooms", parsed.data.roomId, "members"],
          }),
          queryClient.invalidateQueries({ queryKey: ["me", "rooms"] }),
        ]);
        return;
      }

      if (data.type === "room.updated") {
        const payload = data as RoomUpdatedPayload;
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["rooms"] }),
          queryClient.invalidateQueries({
            queryKey: ["rooms", payload.room.id, "meta"],
          }),
          queryClient.invalidateQueries({ queryKey: ["me", "rooms"] }),
        ]);
        return;
      }

      if (data.type === "room.deleted") {
        void queryClient.invalidateQueries({ queryKey: ["me", "rooms"] });
      }
    };

    sub.on("publication", onPublication);
    if (sub.state !== "subscribed" && sub.state !== "subscribing") {
      sub.subscribe();
    }

    return () => {
      sub.off("publication", onPublication);
    };
  }, [channel, client, conversationId, queryClient]);
}
