import { unlink } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { resolveStoredPath } from "../lib/uploads/storage";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  const rows = await prisma.attachment.findMany({
    where: { messageId: null, createdAt: { lt: cutoff } },
    select: { id: true, storedPath: true },
  });
  console.log(`gc-staged-uploads: ${rows.length} staged rows to purge`);
  for (const row of rows) {
    try {
      await unlink(resolveStoredPath(row.storedPath));
    } catch (err) {
      console.warn("unlink failed", row.storedPath, err);
    }
    await prisma.attachment.delete({ where: { id: row.id } });
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
