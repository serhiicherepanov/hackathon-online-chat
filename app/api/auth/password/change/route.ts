import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { passwordChangeBody } from "@/lib/validation/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = passwordChangeBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const currentPasswordOk = await verifyPassword(
    parsed.data.currentPassword,
    gate.user.passwordHash,
  );

  if (!currentPasswordOk) {
    return NextResponse.json(
      { error: "invalid_current_password" },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: gate.user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
    },
  });

  return NextResponse.json({ ok: true });
}
