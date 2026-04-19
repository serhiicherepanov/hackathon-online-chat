import type { SessionOptions } from "iron-session";

export const SESSION_COOKIE_NAME = "chat_session";

export function getSessionOptions(): SessionOptions {
  const cookieDomain = process.env.SESSION_COOKIE_DOMAIN?.trim() || undefined;
  const password =
    process.env.SESSION_SECRET ||
    (process.env.NODE_ENV !== "production"
      ? "dev-session-secret-change-me-32chars!!"
      : "");
  if (password.length < 32) {
    throw new Error("SESSION_SECRET must be at least 32 characters");
  }
  return {
    password,
    cookieName: SESSION_COOKIE_NAME,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      domain: cookieDomain,
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    },
  };
}
