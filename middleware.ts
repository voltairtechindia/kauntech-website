/**
 * Session-refresh middleware for the /ar studio.
 *
 * The AR studio authenticates against the KaunTech APP's Supabase project. Like
 * any @supabase/ssr setup, the access token has to be refreshed on each request
 * and the rotated cookies written back — Server Components can't set cookies, so
 * without this the token silently expires and RLS-scoped reads (e.g. the owner's
 * `cards`) start returning ZERO ROWS with no error, which the dashboard would
 * otherwise show as a misleading "No cards yet". Running getUser() here keeps a
 * valid token in the cookies for the downstream RSC/route handlers.
 *
 * Scoped to /ar + /api/ar only so the rest of the marketing site is untouched.
 */
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY } from "@/lib/ar/appAuthBrowser";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  // If AR auth isn't configured, do nothing (keeps non-AR previews working).
  if (!APP_SUPABASE_URL || !APP_SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Touch the session so an expired access token gets refreshed and the new
  // cookies are written onto `response`. Failures are non-fatal — the page's own
  // auth gate handles a genuinely signed-out user.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/ar/:path*", "/api/ar/:path*"],
};
