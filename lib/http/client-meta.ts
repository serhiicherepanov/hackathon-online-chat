export function clientMeta(req: Request): {
  userAgent: string | undefined;
  ip: string | undefined;
} {
  const userAgent = req.headers.get("user-agent") ?? undefined;
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? undefined;
  return { userAgent, ip };
}
