import { logger } from "@/lib/logger";

export function reportError(err: unknown, context?: Record<string, unknown>) {
  logger.error({ err, ...context }, "ui error");
}
