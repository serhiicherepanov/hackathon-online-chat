import { getIronSession } from "iron-session";
import { NextResponse, type NextRequest } from "next/server";
import type { SessionData } from "@/lib/auth/session";
import { getSessionOptions } from "@/lib/auth/session-options";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const session = await getIronSession<SessionData>(
    request,
    response,
    getSessionOptions(),
  );
  const authed = Boolean(session.token);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/rooms") || pathname.startsWith("/dm")) {
    if (!authed) {
      const url = request.nextUrl.clone();
      url.pathname = "/sign-in";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return response;
  }

  if (pathname === "/sign-in" || pathname === "/sign-up") {
    if (authed) {
      const url = request.nextUrl.clone();
      url.pathname = "/rooms";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/rooms/:path*", "/dm/:path*", "/sign-in", "/sign-up"],
};
