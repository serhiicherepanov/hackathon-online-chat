import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { ulid } from "ulid";

const prisma = new PrismaClient();

const USERNAME = "bench_admin";
const EMAIL = "bench_admin@example.com";
const ROOM_NAME = "r4-benchmark-10k";
const MESSAGE_COUNT = Number(process.env.BENCHMARK_MESSAGE_COUNT ?? "10000");
const BATCH_SIZE = 250;

async function ensureBenchmarkRoom() {
  const passwordHash = await argon2.hash("password1234");
  const user = await prisma.user.upsert({
    where: { username: USERNAME },
    update: {},
    create: {
      username: USERNAME,
      email: EMAIL,
      passwordHash,
    },
    select: { id: true, username: true },
  });

  const existingRoom = await prisma.room.findUnique({
    where: { name: ROOM_NAME },
    select: { id: true, conversationId: true },
  });

  if (existingRoom) {
    await prisma.roomMember.upsert({
      where: {
        roomId_userId: {
          roomId: existingRoom.id,
          userId: user.id,
        },
      },
      update: { role: "owner" },
      create: {
        roomId: existingRoom.id,
        userId: user.id,
        role: "owner",
      },
    });
    return { user, room: existingRoom };
  }

  const created = await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.create({
      data: { type: "room" },
      select: { id: true },
    });
    const room = await tx.room.create({
      data: {
        conversationId: conversation.id,
        name: ROOM_NAME,
        visibility: "public",
        description: "R4 benchmark room with 10k seeded messages.",
      },
      select: { id: true, conversationId: true },
    });
    await tx.roomMember.create({
      data: {
        roomId: room.id,
        userId: user.id,
        role: "owner",
      },
    });
    return room;
  });

  return { user, room: created };
}

async function seedMessages() {
  const { user, room } = await ensureBenchmarkRoom();
  const existingCount = await prisma.message.count({
    where: { conversationId: room.conversationId },
  });

  if (existingCount >= MESSAGE_COUNT) {
    console.log("seed-r4-benchmark: already ready", {
      roomName: ROOM_NAME,
      conversationId: room.conversationId,
      messages: existingCount,
    });
    return;
  }

  const anchor = new Date("2026-04-19T00:00:00.000Z").getTime();

  for (let start = existingCount; start < MESSAGE_COUNT; start += BATCH_SIZE) {
    const end = Math.min(start + BATCH_SIZE, MESSAGE_COUNT);
    const data = [];
    for (let index = start; index < end; index += 1) {
      data.push({
        id: ulid(),
        conversationId: room.conversationId,
        authorId: user.id,
        body: `Benchmark message #${index + 1}`,
        createdAt: new Date(anchor + index * 1000),
      });
    }
    await prisma.message.createMany({ data });
    console.log("seed-r4-benchmark: batch", {
      from: start + 1,
      to: end,
      total: MESSAGE_COUNT,
    });
  }

  console.log("seed-r4-benchmark: done", {
    roomName: ROOM_NAME,
    roomId: room.id,
    conversationId: room.conversationId,
    messages: MESSAGE_COUNT,
    owner: user.username,
  });
}

seedMessages()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
