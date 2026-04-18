import pino, { type Logger } from "pino";

const globalForLogger = globalThis as unknown as { logger?: Logger };

export const logger: Logger =
  globalForLogger.logger ??
  pino({
    level: process.env.LOG_LEVEL ?? "info",
    base: {
      service: "app",
      env: process.env.NODE_ENV ?? "development",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

if (process.env.NODE_ENV !== "production") {
  globalForLogger.logger = logger;
}

export function reportError(err: unknown, context: Record<string, unknown> = {}) {
  logger.error({ err, ...context }, "unhandled error");
}
