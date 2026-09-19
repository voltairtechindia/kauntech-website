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
