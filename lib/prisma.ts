import { PrismaClient, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const client = new PrismaClient({
    log: [
      { level: "query", emit: "event" },
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
    ],
  });

  client.$on("query", (e: Prisma.QueryEvent) => {
    logger.debug(
      { query: e.query, params: e.params, durationMs: e.duration },
      "prisma query",
    );
  });
  client.$on("warn", (e: Prisma.LogEvent) => {
    logger.warn({ target: e.target }, e.message);
  });
  client.$on("error", (e: Prisma.LogEvent) => {
    logger.error({ target: e.target }, e.message);
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
