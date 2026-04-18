import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

/**
 * Seed script for R2 social graph and presence state.
 *
 * Creates (idempotently) four users and primes the full spectrum of
 * relationships so local/dev flows can exercise pending, accepted, and
 * blocked states, plus a persisted AFK presence row.
 *
 * Usage inside the Compose stack:
 *   docker compose exec app pnpm tsx scripts/seed-r2-social.ts
 */
const prisma = new PrismaClient();

const PASSWORD_HASH = async () => argon2.hash("password1234");

type SeedUser = { username: string; email: string };

const USERS: SeedUser[] = [
  { username: "alice", email: "alice@example.com" },
  { username: "bob", email: "bob@example.com" },
  { username: "carol", email: "carol@example.com" },
  { username: "dave", email: "dave@example.com" },
];

async function upsertUsers() {
  const hash = await PASSWORD_HASH();
  const rows = [];
  for (const u of USERS) {
    const row = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: { ...u, passwordHash: hash },
      select: { id: true, username: true },
    });
    rows.push(row);
  }
  return rows;
}

function pair(a: string, b: string) {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

async function main() {
  const [alice, bob, carol, dave] = await upsertUsers();

  // Accepted friendship: alice <-> bob.
  await prisma.friendship.upsert({
    where: { userAId_userBId: pair(alice.id, bob.id) },
    update: { status: "accepted", requestedById: alice.id },
    create: {
      ...pair(alice.id, bob.id),
      status: "accepted",
      requestedById: alice.id,
    },
  });

  // Pending friendship: alice -> carol.
  await prisma.friendship.upsert({
    where: { userAId_userBId: pair(alice.id, carol.id) },
    update: { status: "pending", requestedById: alice.id },
    create: {
      ...pair(alice.id, carol.id),
      status: "pending",
      requestedById: alice.id,
    },
  });

  // Blocked pair: bob blocks dave.
  await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId: bob.id, blockedId: dave.id } },
    update: {},
    create: { blockerId: bob.id, blockedId: dave.id },
  });

  // Persisted AFK presence row for carol; online-but-idle for alice.
  const afkTwoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await prisma.presence.upsert({
    where: { userId: carol.id },
    update: { status: "afk", lastActiveAt: afkTwoHoursAgo },
    create: {
      userId: carol.id,
      status: "afk",
      lastActiveAt: afkTwoHoursAgo,
    },
  });
  await prisma.presence.upsert({
    where: { userId: alice.id },
    update: { status: "offline", lastActiveAt: new Date() },
    create: {
      userId: alice.id,
      status: "offline",
      lastActiveAt: new Date(),
    },
  });

  console.log("seed-r2-social: done", {
    alice: alice.username,
    bob: bob.username,
    carol: carol.username,
    dave: dave.username,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
