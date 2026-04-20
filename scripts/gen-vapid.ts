/**
 * One-shot helper: print a fresh VAPID keypair for Web Push.
 *
 * Run via:
 *   docker compose exec app pnpm tsx scripts/gen-vapid.ts
 *
 * Copy the three exports into your `.env` (or your deployment secret store).
 * Rotating the keypair invalidates every existing push subscription — the
 * server auto-prunes them on the next 404/410 from the browser's push service.
 */
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
const lines = [
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`,
  `VAPID_PRIVATE_KEY=${keys.privateKey}`,
  `VAPID_SUBJECT=mailto:admin@example.com`,
];
console.log(lines.join("\n"));
