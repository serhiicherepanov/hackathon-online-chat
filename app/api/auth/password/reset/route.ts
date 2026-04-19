import { NextResponse } from "next/server";
import {
  buildPasswordResetUrl,
  deleteExpiredPasswordResetTokens,
  issuePasswordResetToken,
  logPasswordResetDelivery,
  writePasswordResetDeliveryArtifact,
} from "@/lib/auth/password-reset";
import { prisma } from "@/lib/prisma";
import { passwordResetRequestBody } from "@/lib/validation/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = passwordResetRequestBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (user) {
    const issued = await issuePasswordResetToken(user.id);
    const resetUrl = buildPasswordResetUrl({
      token: issued.token,
      requestUrl: req.url,
    });
    logPasswordResetDelivery({
      email: user.email,
      userId: user.id,
      resetUrl,
      expiresAt: issued.expiresAt,
    });
    await writePasswordResetDeliveryArtifact({
      email: user.email,
      userId: user.id,
      resetUrl,
      expiresAt: issued.expiresAt,
    });
  }

  void deleteExpiredPasswordResetTokens().catch(() => undefined);

  return NextResponse.json({ ok: true });
}
