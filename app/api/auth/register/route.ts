import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { createBrowserSession } from "@/lib/auth/session";
import { clientMeta } from "@/lib/http/client-meta";
import { prisma } from "@/lib/prisma";
import { registerBody } from "@/lib/validation/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = registerBody.safeParse(json);
  if (!parsed.success) {
    const { fieldErrors, formErrors } = parsed.error.flatten();

    return NextResponse.json(
      {
        error: "validation_error",
        details: {
          formErrors,
          fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  const username = parsed.data.username.trim();
  const passwordHash = await hashPassword(parsed.data.password);
  const meta = clientMeta(req);

  try {
    const user = await prisma.user.create({
      data: { email, username, passwordHash },
      select: { id: true, email: true, username: true, createdAt: true },
    });
    await createBrowserSession({
      userId: user.id,
      userAgent: meta.userAgent,
      ip: meta.ip,
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "unique_violation" }, { status: 409 });
    }
    throw e;
  }
}
