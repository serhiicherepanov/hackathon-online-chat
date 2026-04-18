import { NextResponse } from "next/server";
import { destroyBrowserSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await destroyBrowserSession();
  return new NextResponse(null, { status: 204 });
}
