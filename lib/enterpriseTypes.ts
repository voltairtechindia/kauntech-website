/**
 * Shapes and labels for the enterprise seat console.
 *
 * Deliberately free of `next/headers` and any Supabase import, so the client
 * components can share one definition with the server half instead of keeping a
 * second copy that drifts. lib/enterpriseConsole.ts holds everything that needs
 * a cookie session.
 */

export interface OrgSeat {
  user_id: string;
  role: "owner" | "member";
  status: "active" | "frozen";
  full_name: string | null;
  email: string | null;
  alloc: { tokens: number; scans: number; intel: number; strategy: number };
  used: { tokens: number; scans: number; intel: number; strategy: number };
  created_at: string;
}

export interface Org {
  id: string;
  name: string;
  status: "active" | "suspended" | "expired";
  seat_limit: number;
  expires_at: string | null;
  pools: { tokens: number; scans: number; intel: number; strategy: number };
}

export interface OrgView {
  org: Org;
  role: "owner" | "member";
  status: "active" | "frozen";
  seats: OrgSeat[];
}

/** The four things an org buys by the year and hands out per seat. */
export const RESOURCES = ["tokens", "scans", "intel", "strategy"] as const;
export type Resource = (typeof RESOURCES)[number];

export const RESOURCE_LABEL: Record<Resource, string> = {
  tokens: "K-Tokens",
  scans: "Scans",
  intel: "AI Intel",
  strategy: "AI Strategy",
};

/** What is left in each pool after every seat's current allocation. */
export function unallocated(view: OrgView): Record<Resource, number> {
  const out = {} as Record<Resource, number>;
  for (const r of RESOURCES) {
    const handed = view.seats.reduce((sum, s) => sum + (s.alloc?.[r] ?? 0), 0);
    out[r] = view.org.pools[r] - handed;
  }
  return out;
}

/* ───────────────────────────── leads ───────────────────────────── */

export type Temperature = "hot" | "warm" | "cold";
export const TEMPERATURES: Temperature[] = ["hot", "warm", "cold"];

export type RangeKey = "7d" | "30d" | "90d" | "all";
export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

/** What the leads table needs. The drawer loads the full row on open. */
export interface LeadRow {
  id: string;
  user_id: string;
  name: string;
  title: string | null;
  company: string | null;
  email: string | null;
  phone: string | null;
  conference: string | null;
  lead_temperature: Temperature | null;
  lead_score: number | null;
  enrichment_status: string | null;
  strategy_status: string | null;
  scanned_at: string;
}

export const LEAD_LIST_COLUMNS =
  "id,user_id,name,title,company,email,phone,conference,lead_temperature,lead_score,enrichment_status,strategy_status,scanned_at";

/** Filters live in the URL so a filtered view can be shared and survives a refresh. */
export interface LeadFilters {
  q: string;
  by: string;      // seat user_id, or "" for everyone
  event: string;   // conference name, or ""
  temp: Temperature | "";
  range: RangeKey;
  page: number;
}

export const LEADS_PAGE_SIZE = 50;

export function parseLeadFilters(sp: Record<string, string | string[] | undefined>): LeadFilters {
  const one = (k: string) => {
    const v = sp[k];
    return (Array.isArray(v) ? v[0] : v) ?? "";
  };
  const temp = one("temp");
  const range = one("range");
  const page = Math.max(1, Math.floor(Number(one("page")) || 1));
  return {
    q: one("q").slice(0, 80),
    by: one("by"),
    event: one("event").slice(0, 200),
    temp: (TEMPERATURES as string[]).includes(temp) ? (temp as Temperature) : "",
    range: (RANGES.map((r) => r.key) as string[]).includes(range) ? (range as RangeKey) : "all",
    page,
  };
}

export function filtersToQuery(f: Partial<LeadFilters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.by) p.set("by", f.by);
  if (f.event) p.set("event", f.event);
  if (f.temp) p.set("temp", f.temp);
  if (f.range && f.range !== "all") p.set("range", f.range);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

/* ───────────────────────────── display ───────────────────────────── */

export function seatName(s: Pick<OrgSeat, "full_name" | "email"> | undefined | null): string {
  if (!s) return "Former member";
  return s.full_name?.trim() || s.email?.split("@")[0] || "Unnamed";
}

export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** "3h ago", "Yesterday", "12 Sep", "12 Sep 2025" — compact and honest about age. */
export function relTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const mins = Math.round((now - t) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  const d = new Date(t);
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

export function inr(n: number): string {
  return n.toLocaleString("en-IN");
}

/* ───────────────────────────── requests ───────────────────────────── */

/**
 * What a team asks us for from inside their console: more of something they
 * already buy, or something we do not ship yet. The quantity kinds line up
 * one-for-one with the pools on the Team page, so "50 more scans" needs no
 * translation when it reaches the admin panel.
 */
export const REQUEST_KINDS = ["seats", "scans", "intel", "strategy", "tokens", "feature", "other"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

/** The kinds that carry a number; the rest are prose. */
export const COUNTED_KINDS: RequestKind[] = ["seats", "scans", "intel", "strategy", "tokens"];

export const REQUEST_KIND_LABEL: Record<RequestKind, string> = {
  seats: "More seats",
  scans: "More scans",
  intel: "More AI Intel",
  strategy: "More AI Strategy",
  tokens: "More K-Tokens",
  feature: "A feature we don't have",
  other: "Something else",
};

/** The unit that follows the number in "3 more seats". */
export const REQUEST_KIND_UNIT: Partial<Record<RequestKind, string>> = {
  seats: "seats",
  scans: "scans",
  intel: "AI Intel runs",
  strategy: "AI Strategy runs",
  tokens: "K-Tokens",
};

export const REQUEST_STATUSES = ["new", "seen", "planned", "done", "declined"] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

/** Written for the owner, not for us: each one says what happens next. */
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  new: "Sent",
  seen: "We've read it",
  planned: "Planned",
  done: "Done",
  declined: "Not planned",
};

export interface OrgRequest {
  id: number;
  org_id: string;
  user_id: string | null;
  kind: RequestKind;
  amount: number | null;
  title: string;
  message: string | null;
  status: RequestStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}
