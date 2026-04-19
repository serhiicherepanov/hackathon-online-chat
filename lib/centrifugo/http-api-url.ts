/**
 * Builds absolute URLs for Centrifugo's HTTP admin API (`/api/*`).
 *
 * `CENTRIFUGO_URL` may be a bare origin (e.g. `http://centrifugo:3080`) or include
 * a path when Centrifugo is exposed behind a reverse proxy under a subpath
 * (e.g. `https://chat.example.com/realtime`). Trailing slashes on the base are ignored.
 */
export function centrifugoHttpApiUrl(apiPath: string): string {
  const raw = process.env.CENTRIFUGO_URL ?? "http://localhost:3080";
  const base = raw.replace(/\/+$/, "");
  const path = apiPath.replace(/^\/+/, "");
  return `${base}/${path}`;
}
