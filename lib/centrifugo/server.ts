import { logger } from "@/lib/logger";

const baseUrl = () => process.env.CENTRIFUGO_URL ?? "http://localhost:3080";
const apiKey = () => process.env.CENTRIFUGO_API_KEY ?? "";

async function centrifugoPost(path: string, body: unknown): Promise<Response> {
  return fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `apikey ${apiKey()}`,
    },
    body: JSON.stringify(body),
  });
}

export async function centrifugoPublish(
  channel: string,
  data: unknown,
): Promise<void> {
  const res = await centrifugoPost("/api/publish", { channel, data });
  if (!res.ok) {
    const text = await res.text();
    logger.warn(
      { channel, status: res.status, text },
      "centrifugo publish failed",
    );
  }
}

export async function centrifugoBroadcast(
  channels: string[],
  data: unknown,
): Promise<void> {
  const res = await centrifugoPost("/api/broadcast", { channels, data });
  if (!res.ok) {
    const text = await res.text();
    logger.warn(
      { channels, status: res.status, text },
      "centrifugo broadcast failed",
    );
  }
}

export async function centrifugoUnsubscribe(
  user: string,
  channel: string,
): Promise<void> {
  const res = await centrifugoPost("/api/unsubscribe", { user, channel });
  if (!res.ok) {
    const text = await res.text();
    logger.warn(
      { user, channel, status: res.status, text },
      "centrifugo unsubscribe failed",
    );
  }
}

type PresenceResult = {
  result?: {
    presence?: Record<
      string,
      { client?: string; user?: string; conn_info?: unknown } | undefined
    >;
  };
};

export async function centrifugoPresenceClientCount(
  channel: string,
): Promise<number> {
  const res = await centrifugoPost("/api/presence", { channel });
  if (!res.ok) {
    const text = await res.text();
    logger.warn(
      { channel, status: res.status, text },
      "centrifugo presence failed",
    );
    return 0;
  }
  const json = (await res.json()) as PresenceResult;
  const presence = json.result?.presence;
  if (!presence) return 0;
  return Object.keys(presence).length;
}
