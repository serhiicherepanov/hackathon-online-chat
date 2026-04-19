/**
 * R4 realtime load test: ~N concurrent Centrifuge clients (production-style
 * subscriptions: user:{id}, presence, room:{conversationId}).
 *
 * Run inside the app container so HTTP + DB + Centrifugo hostnames match Compose:
 *   docker compose exec app pnpm tsx scripts/load-test-realtime.ts
 *
 * Env:
 *   BASE_URL — app origin for sign-in (default http://localhost:3080, fine from the app container)
 *   WS_URL — Centrifugo WebSocket URL. From **inside** the app container use the defaults below so
 *            traffic hits `centrifugo:3080`, not `localhost` (which would target Next.js).
 *   LOADTEST_ROOM_NAME — must match seed (default r4-loadtest-presence)
 *   LOADTEST_USER_COUNT — how many clients (default 300)
 *   SIGNIN_CONCURRENCY — parallel sign-ins (default 25)
 *   CENTRIFUGO_URL, CENTRIFUGO_API_KEY — publish + presence probe (`http://centrifugo:3080` in Compose)
 */
import { PrismaClient } from "@prisma/client";
import { Centrifuge } from "centrifuge";
import WebSocket from "ws";

const prisma = new PrismaClient();

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3080";
/** Prefer `WS_URL`; avoid NEXT_PUBLIC here — browser URLs often use localhost/Traefik and break inside the app container. */
const WS_URL = process.env.WS_URL ?? "ws://centrifugo:3080/connection/websocket";
const ROOM_NAME = process.env.LOADTEST_ROOM_NAME ?? "r4-loadtest-presence";
const USER_COUNT = Math.min(
  500,
  Math.max(1, Number(process.env.LOADTEST_USER_COUNT ?? "300")),
);
const SIGNIN_CONCURRENCY = Math.max(
  1,
  Number(process.env.SIGNIN_CONCURRENCY ?? "25"),
);

const PASSWORD = "password1234";

function usernameFor(index: number) {
  return `lt4_${index.toString().padStart(3, "0")}`;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx]!;
}

function summarize(name: string, samples: number[]) {
  const s = [...samples].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    name,
    n: s.length,
    min: s[0] ?? NaN,
    max: s[s.length - 1] ?? NaN,
    avg: s.length ? sum / s.length : NaN,
    p50: percentile(s, 50),
    p95: percentile(s, 95),
    p99: percentile(s, 99),
  };
}

async function signIn(login: string): Promise<{ cookie: string; userId: string }> {
  const res = await fetch(`${BASE_URL.replace(/\/$/, "")}/api/auth/sign-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login, password: PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`sign-in failed ${login}: ${res.status} ${text}`);
  }
  const json = (await res.json()) as { user: { id: string } };
  const raw = res.headers.getSetCookie?.() ?? [];
  const cookie = raw.map((c) => c.split(";")[0]).join("; ");
  if (!cookie || !json.user?.id) {
    throw new Error(`sign-in missing cookie or user id for ${login}`);
  }
  return { cookie, userId: json.user.id };
}

function subReady(sub: ReturnType<Centrifuge["newSubscription"]>): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error("subscription timeout"));
    }, 60_000);
    sub.once("subscribed", () => {
      clearTimeout(t);
      resolve();
    });
    sub.once("error", (e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

type OpenClient = {
  centrifuge: Centrifuge;
  subRoom: ReturnType<Centrifuge["newSubscription"]>;
  connectMs: number;
  subUserMs: number;
  subRoomMs: number;
  subPresenceMs: number;
};

async function openClient(args: {
  conversationId: string;
  cookie: string;
  userId: string;
}): Promise<OpenClient> {
  const { cookie, userId, conversationId } = args;

  const centrifuge = new Centrifuge(WS_URL, {
    websocket: WebSocket,
  });
  centrifuge.setHeaders({ Cookie: cookie });

  const tConnectStart = performance.now();
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("connect timeout")), 60_000);
    centrifuge.once("connected", () => {
      clearTimeout(timer);
      resolve();
    });
    centrifuge.once("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    centrifuge.connect();
  });
  const connectMs = performance.now() - tConnectStart;

  const userCh = `user:${userId}`;
  const roomCh = `room:${conversationId}`;

  const subUser = centrifuge.newSubscription(userCh);
  const subRoom = centrifuge.newSubscription(roomCh);
  const subPresence = centrifuge.newSubscription("presence");

  const tUser = performance.now();
  subUser.subscribe();
  await subReady(subUser);
  const subUserMs = performance.now() - tUser;

  const tRoom = performance.now();
  subRoom.subscribe();
  await subReady(subRoom);
  const subRoomMs = performance.now() - tRoom;

  const tPr = performance.now();
  subPresence.subscribe();
  await subReady(subPresence);
  const subPresenceMs = performance.now() - tPr;

  return {
    centrifuge,
    subRoom,
    connectMs,
    subUserMs,
    subRoomMs,
    subPresenceMs,
  };
}

function waitForRoomPing(
  subRoom: OpenClient["subRoom"],
  pingId: string,
  tPub: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      subRoom.off("publication", onPub);
      reject(new Error(`delivery timeout waiting for ${pingId}`));
    }, 30_000);
    function onPub(ctx: { data?: unknown }) {
      const data = ctx.data as { loadPing?: string };
      if (data?.loadPing !== pingId) return;
      clearTimeout(timer);
      subRoom.off("publication", onPub);
      resolve(performance.now() - tPub);
    }
    subRoom.on("publication", onPub);
  });
}

function closeClient(c: OpenClient) {
  try {
    c.centrifuge.disconnect();
  } catch {
    // ignore
  }
}

async function centrifugoPublish(channel: string, data: unknown): Promise<void> {
  const base = process.env.CENTRIFUGO_URL ?? "http://centrifugo:3080";
  const key = process.env.CENTRIFUGO_API_KEY ?? "";
  const res = await fetch(`${base.replace(/\/$/, "")}/api/publish`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `apikey ${key}`,
    },
    body: JSON.stringify({ channel, data }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`centrifugo publish failed: ${res.status} ${text}`);
  }
}

async function centrifugoPresenceCount(channel: string): Promise<number> {
  const base = process.env.CENTRIFUGO_URL ?? "http://centrifugo:3080";
  const key = process.env.CENTRIFUGO_API_KEY ?? "";
  const res = await fetch(`${base.replace(/\/$/, "")}/api/presence`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `apikey ${key}`,
    },
    body: JSON.stringify({ channel }),
  });
  if (!res.ok) return 0;
  const json = (await res.json()) as {
    result?: { presence?: Record<string, unknown> };
  };
  const p = json.result?.presence;
  return p ? Object.keys(p).length : 0;
}

async function poolMap<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      out[idx] = await fn(items[idx]!, idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

async function main() {
  const room = await prisma.room.findUnique({
    where: { name: ROOM_NAME },
    select: { id: true, conversationId: true },
  });
  if (!room) {
    throw new Error(
      `Room "${ROOM_NAME}" not found. Run: docker compose exec app pnpm seed:loadtest-users`,
    );
  }

  console.log(
    JSON.stringify(
      {
        phase: "sign-in",
        baseUrl: BASE_URL,
        wsUrl: WS_URL,
        room: ROOM_NAME,
        conversationId: room.conversationId,
        clients: USER_COUNT,
      },
      null,
      2,
    ),
  );

  const indices = Array.from({ length: USER_COUNT }, (_, i) => i);
  const sessions = await poolMap(indices, SIGNIN_CONCURRENCY, async (i) =>
    signIn(usernameFor(i)),
  );

  console.log(
    JSON.stringify({ phase: "connect-subscribe", startedAt: Date.now() }),
    null,
    2,
  );

  const clients = await poolMap(indices, 40, async (i) =>
    openClient({
      conversationId: room.conversationId,
      cookie: sessions[i]!.cookie,
      userId: sessions[i]!.userId,
    }),
  );

  const presenceWhileConnected = await centrifugoPresenceCount(
    `room:${room.conversationId}`,
  );
  console.log(
    JSON.stringify(
      {
        phase: "presence_probe_connected",
        channel: `room:${room.conversationId}`,
        centrifugoPresenceClientEntries: presenceWhileConnected,
      },
      null,
      2,
    ),
  );

  const broadcastId = `r4-broadcast-${Date.now()}`;
  const tPub = performance.now();
  await centrifugoPublish(`room:${room.conversationId}`, {
    loadPing: broadcastId,
    t: tPub,
  });

  const deliveryTimes = await poolMap(clients, 60, (c) =>
    waitForRoomPing(c.subRoom, broadcastId, tPub),
  );

  for (const c of clients) closeClient(c);

  const connect = clients.map((c) => c.connectMs);
  const delivery = deliveryTimes;

  const report = {
    generatedAt: new Date().toISOString(),
    clients: USER_COUNT,
    channel: `room:${room.conversationId}`,
    connect: summarize("centrifuge_connect_ms", connect),
    delivery: summarize("room_publication_fanout_latency_ms", delivery),
    subscribeUser: summarize("sub_user_ms", clients.map((c) => c.subUserMs)),
    subscribeRoom: summarize("sub_room_ms", clients.map((c) => c.subRoomMs)),
    subscribePresence: summarize("sub_presence_ms", clients.map((c) => c.subPresenceMs)),
  };

  console.log(JSON.stringify({ phase: "metrics", ...report }, null, 2));

  const thresholds = {
    targetConcurrentClients: 300,
    releaseDeliveryP95MsHint: 3000,
  };
  const okClients = USER_COUNT >= 250;
  const okDelivery =
    Number.isFinite(report.delivery.p95) && report.delivery.p95 <= thresholds.releaseDeliveryP95MsHint;

  console.log(
    JSON.stringify(
      {
        phase: "thresholds",
        ...thresholds,
        pass: { clients: okClients, deliveryP95: okDelivery },
      },
      null,
      2,
    ),
  );

  if (!okClients) {
    console.error("Load test: raise LOADTEST_USER_COUNT toward 300 for release verification.");
  }
  if (!okDelivery) {
    console.error(
      "Load test: room publication p95 exceeds hint (ms). Tune stack or investigate network.",
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
