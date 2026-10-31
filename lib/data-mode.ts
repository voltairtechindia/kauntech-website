/**
 * Build-time data mode for the static site.
 *
 * With database settings (SUPABASE_URL + SUPABASE_SERVICE_KEY), a failed query
 * fails the build, so a broken database never replaces a good live site.
 * Without them (an "offline" build), DB-backed lists render empty instead and
 * the rest of the site still ships.
 */
export const DB_CONFIGURED = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY);

export function orEmpty<T>(load: () => Promise<T>, empty: T): Promise<T> {
  return DB_CONFIGURED ? load() : load().catch(() => empty);
}
