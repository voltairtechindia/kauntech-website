import { NextResponse } from "next/server";
import { guardSeatRoute, isFailure } from "@/lib/enterpriseAdminGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Set an employee's password.
 *
 * The owner paid for the seat, so they hold the keys to it — but only to seats
 * on their own plan, which the guard proves against their roster before the
 * service-role client is even reached. The new password is never emailed: the
 * owner types it and hands it over, and the employee can change it in the app.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await guardSeatRoute(req, id);
  if (isFailure(guard)) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  const { admin } = guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const password = String(body?.password ?? "");
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Use at least 8 characters." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
