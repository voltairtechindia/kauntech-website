import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PKCE / magic-link callback. Supabase redirects here with ?code=... after the
 * user clicks the email link or completes Google OAuth. We exchange it for a
 * cookie session (set by the @supabase/ssr server client) then bounce to the
 * studio. On error, back to login with a flag.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/ar";

  if (!code) {
    return NextResponse.redirect(new URL("/ar/login?error=missing_code", url.origin));
  }

  const supabase = await createArServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/ar/login?error=auth", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
