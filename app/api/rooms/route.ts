import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createRoomBody } from "@/lib/validation/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();

  const rooms = await prisma.room.findMany({
    where: {
      visibility: "public",
      ...(search
        ? { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
        : {}),
    },
    include: {
      _count: { select: { members: true } },
      members: {
        where: { userId: gate.user.id },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  return NextResponse.json({
    rooms: rooms.map((r) => ({
      id: r.id,
      conversationId: r.conversationId,
      name: r.name,
      description: r.description,
      visibility: r.visibility,
      memberCount: r._count.members,
      isMember: r.members.length > 0,
    })),
  });
}

export async function POST(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createRoomBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  const name = parsed.data.name.trim();
  const description = parsed.data.description?.trim() || null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: { type: "room" },
      });
      const room = await tx.room.create({
        data: {
          conversationId: conversation.id,
          name,
          description,
          visibility: parsed.data.visibility,
        },
      });
      await tx.roomMember.create({
        data: {
          roomId: room.id,
          userId: gate.user.id,
          role: "owner",
        },
      });
      return { room, conversationId: conversation.id };
    });

    return NextResponse.json(
      {
        room: {
          id: result.room.id,
          conversationId: result.conversationId,
          name: result.room.name,
          description: result.room.description,
          visibility: result.room.visibility,
        },
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "room_name_taken" }, { status: 409 });
    }
    throw e;
  }
}
