import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import {
  deleteExpiredPasswordResetTokens,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
} from "@/lib/auth/password-reset";
import { prisma } from "@/lib/prisma";
import { passwordResetConfirmBody } from "@/lib/validation/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = passwordResetConfirmBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const token = parsed.data.token.trim();
  const row = await findValidPasswordResetToken(token);

  if (!row) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const didConsume = await prisma.$transaction(async (tx) => {
    const consumed = await markPasswordResetTokenUsed(row.id, tx);
    if (!consumed) {
      return false;
    }

    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    });

    return true;
  });

  if (!didConsume) {
    return NextResponse.json({ error: "invalid_or_expired_token" }, { status: 400 });
  }

  void deleteExpiredPasswordResetTokens().catch(() => undefined);

  return NextResponse.json({ ok: true });
}
