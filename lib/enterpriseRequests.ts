/**
 * What this team has asked us for. SERVER-ONLY.
 *
 * Read as the signed-in owner, like everything else in the console: RLS on
 * enterprise_requests says "the org you run", so a teammate cannot see what
 * their boss asked us and one company can never see another's.
 */
import { createArServerClient } from "@/lib/ar/appAuth";
import type { OrgRequest } from "@/lib/enterpriseTypes";

/** Plenty: this is a conversation, not a feed. */
const CAP = 200;

export async function getRequests(orgId: string): Promise<OrgRequest[]> {
  const sb = await createArServerClient();
  const { data, error } = await sb
    .from("enterprise_requests")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(CAP);
  if (error) throw error;
  return (data ?? []) as OrgRequest[];
}

/** How many asks are still open, for the nav badge. A HEAD count: no rows travel. */
export async function getOpenRequestCount(orgId: string): Promise<number> {
  const sb = await createArServerClient();
  const { count } = await sb
    .from("enterprise_requests")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .in("status", ["new", "seen", "planned"]);
  return count ?? 0;
}
