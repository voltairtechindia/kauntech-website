/**
 * The team's lead pool, read for the console. SERVER-ONLY.
 *
 * Runs as the signed-in owner through the cookie session — never the service
 * role. RLS on contacts already says "your rows, or your org's", so these
 * queries simply add `org_id = <this org>` to show the shared pool and leave
 * the owner's private pre-join leads out of it.
 */
import { createArServerClient } from "@/lib/ar/appAuth";
import {
  LEAD_LIST_COLUMNS,
  LEADS_PAGE_SIZE,
  RANGES,
  type LeadFilters,
  type LeadRow,
  type Temperature,
} from "@/lib/enterpriseTypes";

/** Anything that would break PostgREST's or() grammar goes; the rest is matched as a substring. */
export function cleanSearch(q: string): string {
  return q.replace(/[,()*%\\:"']/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
}

export function sinceFor(range: LeadFilters["range"]): string | null {
  const days = RANGES.find((r) => r.key === range)?.days;
  return days ? new Date(Date.now() - days * 86_400_000).toISOString() : null;
}

/** The same filter set, applied to any contacts query builder. */
export function applyLeadFilters<Q extends { eq: any; gte: any; or: any }>(query: Q, f: LeadFilters): Q {
  let q: any = query;
  if (f.by) q = q.eq("user_id", f.by);
  if (f.event) q = q.eq("conference", f.event);
  if (f.temp) q = q.eq("lead_temperature", f.temp);
  const since = sinceFor(f.range);
  if (since) q = q.gte("scanned_at", since);
  const s = cleanSearch(f.q);
  if (s) {
    const like = `%${s}%`;
    q = q.or(`name.ilike.${like},company.ilike.${like},email.ilike.${like},title.ilike.${like}`);
  }
  return q;
}

export async function getLeadsPage(orgId: string, f: LeadFilters): Promise<{ rows: LeadRow[]; total: number }> {
  const sb = await createArServerClient();
  const from = (f.page - 1) * LEADS_PAGE_SIZE;
  const base = sb
    .from("contacts")
    .select(LEAD_LIST_COLUMNS, { count: "exact" })
    .eq("org_id", orgId);
  const { data, count, error } = await applyLeadFilters(base, f)
    .order("scanned_at", { ascending: false })
    .range(from, from + LEADS_PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as LeadRow[], total: count ?? 0 };
}

/* ──────────────────────────── overview ──────────────────────────── */

type Slim = {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  title: string | null;
  conference: string | null;
  lead_temperature: Temperature | null;
  enrichment_status: string | null;
  scanned_at: string;
};

export interface PersonActivity {
  user_id: string;
  total: number;
  last30: number;
  lastScan: string | null;
}

export interface Overview {
  total: number;
  last7: number;
  last30: number;
  hot: number;
  intel: number;
  byPerson: Record<string, PersonActivity>;
  recent: Slim[];
  events: { name: string; count: number; lastScan: string }[];
  /** True when the pool is bigger than one read; the numbers are then a floor. */
  truncated: boolean;
}

const OVERVIEW_CAP = 5000;

/**
 * One read of the pool's slim columns, then counted here. A five-to-fifty seat
 * team produces hundreds to low thousands of leads, well inside one page; the
 * cap is a guard, and the page says so if it ever bites.
 */
export async function getOverview(orgId: string): Promise<Overview> {
  const sb = await createArServerClient();
  const { data, error } = await sb
    .from("contacts")
    .select("id,user_id,name,company,title,conference,lead_temperature,enrichment_status,scanned_at")
    .eq("org_id", orgId)
    .order("scanned_at", { ascending: false })
    .limit(OVERVIEW_CAP);
  if (error) throw error;
  const rows = (data ?? []) as Slim[];

  const now = Date.now();
  const d7 = now - 7 * 86_400_000;
  const d30 = now - 30 * 86_400_000;
  const byPerson: Record<string, PersonActivity> = {};
  const events = new Map<string, { count: number; lastScan: string }>();
  let last7 = 0, last30 = 0, hot = 0, intel = 0;

  for (const r of rows) {
    const t = new Date(r.scanned_at).getTime();
    if (t >= d7) last7++;
    if (t >= d30) last30++;
    if (r.lead_temperature === "hot") hot++;
    if (r.enrichment_status === "completed") intel++;

    const p = (byPerson[r.user_id] ??= { user_id: r.user_id, total: 0, last30: 0, lastScan: null });
    p.total++;
    if (t >= d30) p.last30++;
    if (!p.lastScan) p.lastScan = r.scanned_at; // rows are newest first

    const ev = r.conference?.trim();
    if (ev) {
      const e = events.get(ev);
      if (e) e.count++;
      else events.set(ev, { count: 1, lastScan: r.scanned_at });
    }
  }

  return {
    total: rows.length,
    last7,
    last30,
    hot,
    intel,
    byPerson,
    recent: rows.slice(0, 8),
    events: [...events.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    truncated: rows.length >= OVERVIEW_CAP,
  };
}

/** Every event name used in the pool, for the Leads filter. */
export async function getEventNames(orgId: string): Promise<string[]> {
  const sb = await createArServerClient();
  const { data } = await sb
    .from("contacts")
    .select("conference")
    .eq("org_id", orgId)
    .not("conference", "is", null)
    .limit(OVERVIEW_CAP);
  const names = new Set<string>();
  for (const r of (data ?? []) as { conference: string | null }[]) {
    const n = r.conference?.trim();
    if (n) names.add(n);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Size of the shared pool, for the nav. A HEAD count: no rows travel. */
export async function getLeadCount(orgId: string): Promise<number> {
  const sb = await createArServerClient();
  const { count } = await sb
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId);
  return count ?? 0;
}
