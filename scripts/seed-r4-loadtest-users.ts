import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

/**
 * Idempotently creates N users and a shared public room so load tests can
 * subscribe `user:{id}`, `presence`, and `room:{conversationId}` like production.
 *
 * Usage (inside Compose):
 *   docker compose exec app pnpm tsx scripts/seed-r4-loadtest-users.ts
 *
 * Env:
 *   LOADTEST_USER_COUNT — default 300
 *   LOADTEST_ROOM_NAME  — default r4-loadtest-presence
 */
const prisma = new PrismaClient();

const DEFAULT_COUNT = 300;
const LOADTEST_ROOM_NAME = process.env.LOADTEST_ROOM_NAME ?? "r4-loadtest-presence";
const COUNT = Math.min(
  500,
  Math.max(1, Number(process.env.LOADTEST_USER_COUNT ?? DEFAULT_COUNT)),
);

function usernameFor(index: number) {
  return `lt4_${index.toString().padStart(3, "0")}`;
}

async function main() {
  const passwordHash = await argon2.hash("password1234");
  const users: { id: string; username: string }[] = [];

  for (let i = 0; i < COUNT; i += 1) {
    const username = usernameFor(i);
    const email = `${username}@example.com`;
    const row = await prisma.user.upsert({
      where: { username },
      update: {},
      create: { username, email, passwordHash },
      select: { id: true, username: true },
    });
    users.push(row);
  }

  const existingRoom = await prisma.room.findUnique({
    where: { name: LOADTEST_ROOM_NAME },
    select: { id: true, conversationId: true },
  });

  const room =
    existingRoom ??
    (await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.create({
        data: { type: "room" },
        select: { id: true },
      });
      return tx.room.create({
        data: {
          conversationId: conversation.id,
          name: LOADTEST_ROOM_NAME,
          visibility: "public",
          description: "R4 realtime load-test room (shared membership).",
        },
        select: { id: true, conversationId: true },
      });
    }));

  const ownerId = users[0]!.id;
  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId: room.id, userId: ownerId } },
    update: { role: "owner" },
    create: { roomId: room.id, userId: ownerId, role: "owner" },
  });

  for (const u of users) {
    if (u.id === ownerId) continue;
    await prisma.roomMember.upsert({
      where: { roomId_userId: { roomId: room.id, userId: u.id } },
      update: {},
      create: { roomId: room.id, userId: u.id, role: "member" },
    });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        roomName: LOADTEST_ROOM_NAME,
        roomId: room.id,
        conversationId: room.conversationId,
        users: COUNT,
        password: "password1234",
        usernames: `${usernameFor(0)}…${usernameFor(COUNT - 1)}`,
      },
      null,
      2,
    ),
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
