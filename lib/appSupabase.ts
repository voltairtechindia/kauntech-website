/**
 * Server-side client for the KaunTech *app's* Supabase project — a DIFFERENT
 * project from this site's own (blog/careers/RAG) database. Used only for
 * referral data (referral_clicks). Service-role key; never import client-side.
 *
 * Returns null when not configured so callers can degrade gracefully (the /r
 * redirect still works, it just skips click logging).
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getAppSupabase(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.KAUNTECH_APP_SUPABASE_URL;
  const key = process.env.KAUNTECH_APP_SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
