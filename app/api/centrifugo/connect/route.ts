import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { randomBytes } from "node:crypto";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_TTL_SECONDS = 10 * 60;

function getSecret(): Uint8Array | null {
  const secret = process.env.CENTRIFUGO_TOKEN_HMAC_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function POST() {
  const secret = getSecret();
  if (!secret) {
    logger.error("CENTRIFUGO_TOKEN_HMAC_SECRET is not set");
    return NextResponse.json(
      { error: "server_misconfigured" },
      { status: 500 },
    );
  }

  let sub: string;
  if (process.env.NODE_ENV === "production") {
    // TODO(R0-auth): replace with real session lookup once auth lands.
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  } else {
    sub = `dev-${randomBytes(4).toString("hex")}`;
  }

  const now = Math.floor(Date.now() / 1000);
  const builder = new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(sub)
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
