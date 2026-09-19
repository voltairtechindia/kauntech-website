import { NextResponse } from "next/server";
import { guardSeatRoute, isFailure } from "@/lib/enterpriseAdminGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Long enough to mean "until somebody un-freezes this", short enough that
// GoTrue accepts it as a duration. Un-freezing sets it back to "none".
const FOREVER = "876000h";

/**
 * Freeze or un-freeze a seat.
 *
 * Two halves that must both happen: the database frees the seat and returns its
 * allowance to the pool, and GoTrue stops the login. Data is never touched —
 * everything that person scanned stays in the company pool, and un-freezing
 * puts them straight back to work.
 *
 * The database half runs first. If the ban then fails, the seat is already
 * spend-less and the owner sees the error and can retry, which is the safer of
 * the two orders: a banned account with a live allowance would be a seat the
 * owner has paid for and cannot use.
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
  const { admin, asOwner } = guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const status = body?.status === "frozen" ? "frozen" : "active";

  const { data, error } = await asOwner.rpc("enterprise_set_member_status", {
    p_user: id,
    p_status: status,
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  const res = data as any;
  if (res?.ok === false) {
    return NextResponse.json({ ok: false, reason: res.reason }, { status: 400 });
  }

  const { error: banErr } = await (admin.auth.admin as any).updateUserById(id, {
    ban_duration: status === "frozen" ? FOREVER : "none",
  });
  if (banErr) {
    return NextResponse.json(
      {
        ok: false,
        error:
          status === "frozen"
            ? "Their allowance is back in your pool, but we could not block the login. Try freezing again."
            : "Their seat is active again, but we could not restore the login. Try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, status });
}
