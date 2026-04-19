import { execFileSync } from "node:child_process";

const RESET_LOG_RETRY_COUNT = 20;
const RESET_LOG_RETRY_DELAY_MS = 500;
const RESET_DELIVERY_FILE = "/app/uploads/password-reset-deliveries.log";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readDeliveryArtifacts() {
  const cwd = process.cwd();
  return execFileSync(
    "bash",
    [
      "-lc",
      [
        `cd ${JSON.stringify(cwd)} &&`,
        "docker compose -p hackathon-online-chat -f docker-compose.prod.yml --env-file .env.e2e exec -T app",
        "sh -lc",
        `'if [ -f "${RESET_DELIVERY_FILE}" ]; then cat "${RESET_DELIVERY_FILE}"; fi'`,
      ].join(" "),
    ],
    { encoding: "utf8" },
  );
}

export async function getLatestPasswordResetUrl(email: string): Promise<string> {
  for (let attempt = 0; attempt < RESET_LOG_RETRY_COUNT; attempt += 1) {
    const lines = readDeliveryArtifacts()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .reverse();

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as {
          email?: unknown;
          resetUrl?: unknown;
          msg?: unknown;
        };
        if (
          parsed.email === email &&
          typeof parsed.resetUrl === "string"
        ) {
          return parsed.resetUrl;
        }
      } catch {
        continue;
      }
    }

    await sleep(RESET_LOG_RETRY_DELAY_MS);
  }

  throw new Error(`Could not find password reset log entry for ${email}`);
}
