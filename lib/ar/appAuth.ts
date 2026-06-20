/**
 * Server half of the /ar auth clients — imports `next/headers`, so this module
 * is SERVER-ONLY. Client components must import the browser client from
 * lib/ar/appAuthBrowser.ts instead. For convenience the browser-safe helpers
 * (arAuthConfigured, env constants, createArBrowserClient) are re-exported here
 * so server code has a single import.
 *
 * Required env (all safe to expose except the service key):
 *   NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_URL
 *   NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_ANON_KEY
 *   KAUNTECH_APP_SUPABASE_SERVICE_KEY   (server-only, via lib/appSupabase.ts)
 */
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  APP_SUPABASE_ANON_KEY,
  APP_SUPABASE_URL,
  arAuthConfigured,
} from "@/lib/ar/appAuthBrowser";

export {
  APP_SUPABASE_URL,
  APP_SUPABASE_ANON_KEY,
  arAuthConfigured,
  createArBrowserClient,
} from "@/lib/ar/appAuthBrowser";

/**
 * Server client (server components, layouts, route handlers). Reads/writes the
 * session cookies so RLS runs as the signed-in owner. In read-only server
 * component contexts the cookie write is a no-op (Next throws), so we swallow
 * it — the session refresh still happens in the route/callback handlers.
 */
export async function createArServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — ignore; route/callback handlers
          // refresh the session.
        }
      },
    },
  });
}

/** The signed-in app user, or null. Use in /ar server layouts/pages to gate. */
export async function getArUser() {
  if (!arAuthConfigured()) return null;
  const supabase = await createArServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
