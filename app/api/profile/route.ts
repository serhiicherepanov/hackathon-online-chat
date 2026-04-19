import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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

  const updateData: Prisma.UserUpdateInput = {};
  const userModel = Prisma.dmmf.datamodel.models.find((model) => model.name === "User");
  const supportsDisplayName = Boolean(
    userModel?.fields.some((field) => field.name === "displayName"),
  );
  if (supportsDisplayName && parsed.data.displayName !== undefined) {
    (updateData as Record<string, unknown>).displayName =
      parsed.data.displayName?.trim() === "" ? null : parsed.data.displayName;
  }
  if (parsed.data.avatarUrl !== undefined) {
    updateData.avatarUrl = parsed.data.avatarUrl;
  }

  const user = await prisma.user.update({
    where: {
      id: gate.user.id,
    },
    data: updateData,
  });

  return NextResponse.json({
    user: serializeAuthUser(user),
  });
}
