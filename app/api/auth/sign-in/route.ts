import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { createBrowserSession } from "@/lib/auth/session";
import { clientMeta } from "@/lib/http/client-meta";
import { prisma } from "@/lib/prisma";
import { signInBody } from "@/lib/validation/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = signInBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const login = parsed.data.login.trim();
  const emailCandidate = login.toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailCandidate }, { username: login }],
    },
  });

  if (!user) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const meta = clientMeta(req);
  await createBrowserSession({
    userId: user.id,
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    },
  });
}
