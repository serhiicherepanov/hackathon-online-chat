import { NextResponse } from "next/server";
import { deleteAccount } from "@/lib/account/delete-account";
import { destroyBrowserSession, requireSessionUser } from "@/lib/auth/session";
import { deleteAccountBody } from "@/lib/validation/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DELETE_ACCOUNT_CONFIRMATION = "DELETE MY ACCOUNT";

export async function DELETE(req: Request) {
  const gate = await requireSessionUser();
  if (!gate.ok) return gate.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = deleteAccountBody.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_error" }, { status: 400 });
  }

  if (
    parsed.data.username.trim() !== gate.user.username ||
    parsed.data.confirmation.trim().toUpperCase() !== DELETE_ACCOUNT_CONFIRMATION
  ) {
    return NextResponse.json(
      { error: "invalid_confirmation" },
      { status: 400 },
    );
  }

  const result = await deleteAccount(gate.user.id);
  await destroyBrowserSession();

  return NextResponse.json({
    ok: true,
    deletedRoomCount: result.ownedRoomCount,
    tombstoneMessageCount: result.tombstoneMessageCount,
  });
}
