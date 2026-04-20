"use client";

import { reportError } from "@/lib/report-error";
import { getPrefs, type NotificationPrefs } from "./prefs";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = typeof atob === "function" ? atob(b64) : Buffer.from(b64, "base64").toString("binary");
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) buf[i] = raw.charCodeAt(i);
  return buf;
}

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function mirror(prefs: NotificationPrefs) {
  return {
    dm: prefs.dm,
    mention: prefs.mention,
    friendRequest: prefs.friendRequest,
    rooms: prefs.rooms,
    muteUntil: prefs.muteUntil,
  };
}

export async function subscribeForPush(): Promise<boolean> {
  if (!isSupported()) return false;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    let sub = existing;
    if (!sub) {
      const key = urlBase64ToUint8Array(publicKey);
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key.buffer.slice(
          key.byteOffset,
          key.byteOffset + key.byteLength,
        ) as ArrayBuffer,
      });
    }
    const prefs = await getPrefs();
    const json = sub.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return false;
    }
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent,
        mirroredPrefs: mirror(prefs),
      }),
    });
    return res.ok;
  } catch (err) {
    reportError(err, { where: "subscribeForPush" });
    return false;
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isSupported()) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe().catch(() => undefined);
  } catch (err) {
    reportError(err, { where: "unsubscribeFromPush" });
  }
}

export async function getPermissionState(): Promise<
  "unsupported" | NotificationPermission
> {
  if (!isSupported()) return "unsupported";
  return Notification.permission;
}
