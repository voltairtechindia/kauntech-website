/**
 * Server-side Supabase client (service-role key — bypasses RLS).
 *
 * NEVER import this from a Client Component or expose the key to the browser.
 * The chat widget only ever talks to our own /api routes, which use this.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { config } from "./config";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (see .env.local.example).",
      );
    }
    client = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
