import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const postBody = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
  mirroredPrefs: z.record(z.string(), z.unknown()).optional(),
});

const deleteBody = z.object({
  endpoint: z.string().url(),
});

export async function POST(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = postBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const { endpoint, keys, userAgent, mirroredPrefs } = parsed.data;

  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint },
    select: { id: true, userId: true },
  });

  const nextPrefs = (mirroredPrefs ?? {}) as object;

  if (existing) {
    await prisma.pushSubscription.update({
      where: { endpoint },
      data: {
        userId: gate.user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: userAgent ?? undefined,
        mirroredPrefs: nextPrefs,
      },
    });
    return NextResponse.json({ updated: true }, { status: 200 });
  }

  await prisma.pushSubscription.create({
    data: {
      userId: gate.user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent ?? undefined,
      mirroredPrefs: nextPrefs,
    },
  });
  return NextResponse.json({ created: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = deleteBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { userId: gate.user.id, endpoint: parsed.data.endpoint },
  });
  return new Response(null, { status: 204 });
}

export async function PATCH(req: Request) {
  // Update the server-mirrored prefs for a specific endpoint. Used when the
  // user flips a category toggle or changes mute state on the client.
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const schema = z.object({
    endpoint: z.string().url(),
    mirroredPrefs: z.record(z.string(), z.unknown()),
  });
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }
  const updated = await prisma.pushSubscription.updateMany({
    where: { userId: gate.user.id, endpoint: parsed.data.endpoint },
    data: { mirroredPrefs: parsed.data.mirroredPrefs as object },
  });
  if (updated.count === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return new Response(null, { status: 204 });
}
