import webpush from "web-push";
import { logger } from "@/lib/logger";

let initialized = false;

function init(): void {
  if (initialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    logger.warn(
      {
        hasPub: Boolean(publicKey),
        hasPriv: Boolean(privateKey),
        hasSubject: Boolean(subject),
      },
      "VAPID keys missing; push dispatch will be skipped",
    );
    return;
  }
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    initialized = true;
  } catch (err) {
    logger.error({ err }, "web-push setVapidDetails failed");
  }
}

export function isWebPushConfigured(): boolean {
  init();
  return initialized;
}

export type WebPushSendResult = {
  statusCode: number;
};

export async function sendWebPush(
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  },
  payload: Record<string, unknown>,
): Promise<WebPushSendResult> {
  init();
  if (!initialized) return { statusCode: 0 };
  try {
    const res = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload),
      { TTL: 60 },
    );
    return { statusCode: res.statusCode };
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode ?? 0;
    return { statusCode };
  }
}

export { webpush };
