/**
 * Data access for the /enterprise quote form.
 *
 * Unlike contact_submissions, this writes to the KaunTech *app* project rather
 * than the site's own database: acting on an enquiry means granting seats
 * against `profiles` over there, so the enquiry and the grant it becomes live
 * together. Service-role client; the browser never touches Supabase.
 */
import { getAppSupabase } from "@/lib/appSupabase";

/** Needs a team can tick on the form. Stored as a text[] of these keys. */
export const ENTERPRISE_NEEDS = [
  { key: "sso", label: "SSO / single sign-on" },
  { key: "on_prem", label: "On-premise or regional storage" },
  { key: "white_label", label: "White labelling" },
  { key: "api", label: "API access" },
  { key: "crm", label: "CRM integration" },
  { key: "account_manager", label: "Dedicated account manager" },
] as const;

export type EnterpriseNeed = (typeof ENTERPRISE_NEEDS)[number]["key"];

const NEED_KEYS = new Set<string>(ENTERPRISE_NEEDS.map((n) => n.key));

/** Drop anything that isn't one of ours, so the column can't be used as a sink. */
export function sanitizeNeeds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return Array.from(
    new Set(input.filter((v): v is string => typeof v === "string" && NEED_KEYS.has(v))),
  );
}

/**
 * Bounds the form and the API agree on. 5 is the published Enterprise minimum
 * seat count; the ceilings exist only so a typo or a bot can't write a number
 * the table's own sanity check would reject.
 *
 * These are typed in rather than dragged: a team that needs 1,700 seats can say
 * so, instead of being rounded to wherever a slider happened to stop.
 */
export const SEATS = { min: 5, max: 100000 } as const;
export const SCANS = { min: 1, max: 1000000 } as const;
export const INTEL = { min: 0, max: 100000 } as const;
export const STRATEGY = { min: 0, max: 100000 } as const;

export interface EnterpriseEnquiry {
  name: string;
  work_email: string;
  company: string;
  phone: string | null;
  seats: number;
  /** Meaningless when `unlimited_scans` is true; written as 0 there. */
  scans_per_user: number;
  unlimited_scans: boolean;
  intel_per_user: number | null;
  strategy_per_user: number | null;
  needs: string[];
  message: string | null;
  indicative_annual_inr: number | null;
  source: "site" | "app";
  page_url: string | null;
  user_agent: string | null;
}

export async function insertEnterpriseEnquiry(e: EnterpriseEnquiry): Promise<void> {
  const sb = getAppSupabase();
  if (!sb) throw new Error("app supabase not configured");
  const { error } = await sb.from("enterprise_enquiries").insert(e);
  if (error) throw error;
}
