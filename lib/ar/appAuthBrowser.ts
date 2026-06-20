/**
 * Browser-safe half of the /ar auth clients. NO `next/headers` import so it can
 * be pulled into client components. The env reads are NEXT_PUBLIC_* and so are
 * available on the client. Server code imports the server half from
 * lib/ar/appAuth.ts (which also re-exports these).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

export const APP_SUPABASE_URL =
  process.env.NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_URL ?? "";
export const APP_SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_ANON_KEY ?? "";

export function arAuthConfigured(): boolean {
  return Boolean(APP_SUPABASE_URL && APP_SUPABASE_ANON_KEY);
}

/** Browser client (client components). Session persisted to cookies. */
export function createArBrowserClient(): SupabaseClient {
  return createBrowserClient(APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY);
}
