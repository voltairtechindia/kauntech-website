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

  // `next` is attacker-controllable (it rides in the email link), so only a
  // same-site PATH is ever honoured. "//evil.com" and "https://evil.com" both
  // resolve off-origin through `new URL(next, origin)`, so both are rejected.
  const raw = url.searchParams.get("next");
  const next = raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/ar";

  // Send failures back to the door the person actually came through.
  const loginPath = next.startsWith("/enterprise") ? "/enterprise/admin-auth" : "/ar/login";

  if (!code) {
    return NextResponse.redirect(new URL(`${loginPath}?error=missing_code`, url.origin));
  }

  const supabase = await createArServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`${loginPath}?error=auth`, url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
