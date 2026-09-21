import { NextResponse } from "next/server";
import { guardSeatRoute, isFailure } from "@/lib/enterpriseAdminGuard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVITE_LANDING = "https://kauntech.com/enterprise/welcome";

/**
 * Add a seat.
 *
 * Two shapes, both of which create the auth user HERE and now:
 *   password  — the owner types one and hands it over. No email involved.
 *   invite    — Supabase emails a link and the person picks their own.
 *
 * Either way the account exists before enterprise_link_member runs, which is
 * what keeps the free-tier device lock out of the way: the profile is already
 * on the Enterprise tier the first time it signs in, so bind_free_tier_device
 * short-circuits on `paid_tier` instead of hard-blocking the second employee
 * provisioned from one phone.
 */
export async function POST(req: Request) {
  const guard = await guardSeatRoute(req);
  if (isFailure(guard)) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  const { owner, admin } = guard;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request." }, { status: 400 });
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const fullName = body?.full_name ? String(body.full_name).trim() : null;
  const invite = body?.invite === true;
  const password = String(body?.password ?? "");

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "Enter a valid email." }, { status: 400 });
  }
  if (!invite && password.length < 8) {
    return NextResponse.json({ ok: false, error: "Use at least 8 characters." }, { status: 400 });
  }
  if (owner.seats.length >= owner.org.seat_limit) {
    return NextResponse.json(
      { ok: false, error: `Your plan covers ${owner.org.seat_limit} people.` },
      { status: 400 },
    );
  }
  if (owner.seats.some((s) => (s.email ?? "").toLowerCase() === email)) {
    return NextResponse.json({ ok: false, error: "They are already on your plan." }, { status: 400 });
  }

  // Does this email already have a KaunTech account? listUsers is the only way
  // to ask — auth.users is not readable over PostgREST even with service_role.
  let userId: string | null = null;
  let existing = false;
  try {
    const { data } = await (admin.auth.admin as any).listUsers({ page: 1, perPage: 1000 });
    const found = (data?.users ?? []).find(
      (u: any) => (u.email ?? "").toLowerCase() === email,
    );
    if (found) {
      userId = found.id;
      existing = true;
    }
  } catch {
    // Fall through to create; a duplicate create fails loudly below.
  }

  if (!userId) {
    if (invite) {
      const { data, error } = await (admin.auth.admin as any).inviteUserByEmail(email, {
        data: fullName ? { full_name: fullName } : undefined,
        // Without this the invite landed on the bare site root and nothing
        // could accept it. The apex host is the project's site_url, which
        // GoTrue always allows; apex→www is a 308 that keeps the fragment the
        // session rides in.
        redirectTo: INVITE_LANDING,
      });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      userId = data?.user?.id ?? null;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        // The project runs with mailer_autoconfirm on, so a seat created here
        // behaves exactly like one created by signing up in the app.
        email_confirm: true,
        user_metadata: fullName ? { full_name: fullName } : undefined,
      });
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
      }
      userId = data?.user?.id ?? null;
    }
  } else if (!invite) {
    // Existing account, owner supplied a password: setting it would lock the
    // person out of an account that is already theirs. Leave it alone and say so.
    // Their own password keeps working.
  }

  if (!userId) {
    return NextResponse.json({ ok: false, error: "Could not create that account." }, { status: 500 });
  }

  // The seat itself. This is what sets the Enterprise tier and enforces the
  // seat limit again, server-side, against two clicks racing.
  const { data: linked, error: linkErr } = await admin.rpc("enterprise_link_member", {
    p_org: owner.org.id,
    p_user: userId,
    p_email: email,
    p_role: "member",
  });
  if (linkErr) {
    return NextResponse.json({ ok: false, error: linkErr.message }, { status: 400 });
  }
  const res = linked as any;
  if (res?.ok === false) {
    return NextResponse.json({ ok: false, reason: res.reason, seat_limit: res.seat_limit }, { status: 400 });
  }

  return NextResponse.json({ ok: true, user_id: userId, existing });
}
