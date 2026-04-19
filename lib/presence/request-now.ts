export const E2E_NOW_HEADER = "x-e2e-now-ms";

export function getPresenceRequestNow(request: Request): Date {
  if (process.env.E2E_FAKE_TIME !== "1") {
    return new Date();
  }

  const raw = request.headers.get(E2E_NOW_HEADER);
  if (!raw) {
    return new Date();
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return new Date();
  }

  return new Date(parsed);
}
