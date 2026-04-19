import { PrismaClient, Prisma } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import { logger } from "@/lib/logger";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Database backend: "local" (default) or "neon"
const dbBackend = process.env.DB_BACKEND || "local";

function createPrismaClient() {
  // Use Neon serverless adapter when DB_BACKEND is "neon"
  if (dbBackend === "neon") {
    // Configure WebSocket for Neon in Node.js environment
    neonConfig.webSocketConstructor = ws;
    
    const connectionString = process.env.DATABASE_URL!;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    
    const client = new PrismaClient({
      adapter,
      log: [
        { level: "query", emit: "event" },
        { level: "warn", emit: "event" },
        { level: "error", emit: "event" },
      ],
    });

    client.$on("query", (e: Prisma.QueryEvent) => {
      logger.debug(
        { query: e.query, params: e.params, durationMs: e.duration, backend: "neon" },
        "prisma query",
      );
    });
    client.$on("warn", (e: Prisma.LogEvent) => {
      logger.warn({ target: e.target, backend: "neon" }, e.message);
    });
    client.$on("error", (e: Prisma.LogEvent) => {
      logger.error({ target: e.target, backend: "neon" }, e.message);
    });

    logger.info({ backend: "neon" }, "Prisma client initialized with Neon adapter");
    return client;
  }

  // Default: Local PostgreSQL
  const client = new PrismaClient({
    log: [
      { level: "query", emit: "event" },
      { level: "warn", emit: "event" },
      { level: "error", emit: "event" },
    ],
  });

  client.$on("query", (e: Prisma.QueryEvent) => {
    logger.debug(
      { query: e.query, params: e.params, durationMs: e.duration, backend: "local" },
      "prisma query",
    );
  });
  client.$on("warn", (e: Prisma.LogEvent) => {
    logger.warn({ target: e.target, backend: "local" }, e.message);
  });
  client.$on("error", (e: Prisma.LogEvent) => {
    logger.error({ target: e.target, backend: "local" }, e.message);
  });

  logger.info({ backend: "local" }, "Prisma client initialized with local PostgreSQL");
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Log the active database backend on startup
logger.info({ dbBackend }, "Database backend configured");

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
