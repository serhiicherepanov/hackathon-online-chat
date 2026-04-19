import { NextResponse } from "next/server";
import { serializeAuthUser } from "@/lib/auth/serialize";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { profileUpdateBody } from "@/lib/validation/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = profileUpdateBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: {
      id: gate.user.id,
    },
    data: {
      ...(parsed.data.displayName !== undefined
        ? {
            displayName:
              parsed.data.displayName?.trim() === ""
                ? null
                : parsed.data.displayName,
          }
        : {}),
      ...(parsed.data.avatarUrl !== undefined
        ? { avatarUrl: parsed.data.avatarUrl }
        : {}),
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    user: serializeAuthUser(user),
  });
}
