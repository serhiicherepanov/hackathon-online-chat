import { SignJWT } from "jose";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_TTL_SECONDS = 10 * 60;

function getSecret(): Uint8Array | null {
  const secret = process.env.CENTRIFUGO_TOKEN_HMAC_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function isConnectProxyBody(v: unknown): boolean {
  if (typeof v !== "object" || v === null) return false;
  const obj = v as Record<string, unknown>;
  return "client" in obj || "transport" in obj;
}

export async function POST(req: Request) {
  const secret = getSecret();
  if (!secret) {
    logger.error("CENTRIFUGO_TOKEN_HMAC_SECRET is not set");
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 },
    );
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const proxyMode = isConnectProxyBody(body);

  if (proxyMode) {
    const gate = await requireSessionUser();
    if (!gate.ok) {
      return NextResponse.json(
        {
          error: {
            code: 401,
            message: "unauthorized",
            temporary: false,
          },
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ result: { user: gate.user.id } });
  }

  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const now = Math.floor(Date.now() / 1000);
  const builder = new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(gate.user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS);

  if (process.env.CENTRIFUGO_JWT_ISSUER) {
    builder.setIssuer(process.env.CENTRIFUGO_JWT_ISSUER);
  }
  if (process.env.CENTRIFUGO_JWT_AUDIENCE) {
    builder.setAudience(process.env.CENTRIFUGO_JWT_AUDIENCE);
  }

  const token = await builder.sign(secret);
  return NextResponse.json({ token });
}
