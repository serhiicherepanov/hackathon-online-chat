import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const centrifugoUrl = process.env.CENTRIFUGO_URL;
    const centrifugoApiKey = process.env.CENTRIFUGO_API_KEY;

    const [dbReady, centrifugoReady] = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => true),
      fetch(`${centrifugoUrl}/api/info`, {
        headers: {
          Authorization: `apikey ${centrifugoApiKey ?? ""}`,
        },
      }).then((res) => res.ok),
    ]);

    if (!dbReady || !centrifugoReady) {
      return NextResponse.json(
        {
          status: "degraded",
          db: dbReady ? "up" : "down",
          centrifugo: centrifugoReady ? "up" : "down",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ status: "ok", db: "up", centrifugo: "up" });
  } catch (err) {
    logger.error({ err }, "health check failed");
    return NextResponse.json(
      { status: "degraded", db: "down", centrifugo: "down" },
      { status: 503 },
    );
  }
}
