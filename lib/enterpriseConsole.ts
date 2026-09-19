/**
 * Server half of the enterprise seat console. Imports `next/headers`, so this
 * module is SERVER-ONLY — client components take the shapes and labels from
 * lib/enterpriseTypes.ts instead.
 *
 * Everything here runs as the SIGNED-IN ORG OWNER through the cookie session,
 * not with the service-role key: enterprise_my_org() and the enterprise_*
 * functions authorise against auth.uid() themselves, so a bug on this page can
 * only ever reach one company's seats.
 *
 * The two things SQL cannot do — create an auth user and set a password — live
 * in the route handlers under app/api/enterprise/admin, which re-check
 * ownership through getOrgOwner() before they touch GoTrue.
 */
import { createArServerClient, arAuthConfigured } from "@/lib/ar/appAuth";
import type { Org, OrgSeat, OrgView } from "@/lib/enterpriseTypes";

export {
  RESOURCES,
  RESOURCE_LABEL,
  unallocated,
  type Org,
  type OrgSeat,
  type OrgView,
  type Resource,
} from "@/lib/enterpriseTypes";

/** The whole org as the signed-in person is allowed to see it, or null. */
export async function getOrgView(): Promise<OrgView | null> {
  if (!arAuthConfigured()) return null;
  const supabase = await createArServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("enterprise_my_org");
  if (error || !data) return null;
  const res = data as any;
  if (!res.ok || !res.org) return null;
  return {
    org: res.org as Org,
    role: res.role,
    status: res.status,
    seats: (res.seats ?? []) as OrgSeat[],
  };
}

/**
 * The org this person OWNS, or null. The console gate: a seat who is not the
 * owner has nothing to manage and is sent back to the sign-in page.
 */
export async function getOrgOwner(): Promise<OrgView | null> {
  const view = await getOrgView();
  if (!view || view.role !== "owner" || view.status !== "active") return null;
  return view;
}
