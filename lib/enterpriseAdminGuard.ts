/**
 * The gate every enterprise seat ROUTE goes through.
 *
 * These routes are the only place in the console that holds the service-role
 * key, because creating an auth user, setting a password and banning a login
 * are GoTrue operations with no SQL equivalent. So each one first proves, as
 * the signed-in person, that they own an org — and then proves the seat they
 * are acting on belongs to that same org. Neither check trusts the request
 * body, and the service client is never reached before both have passed.
 */
import { getOrgOwner, type OrgView } from "@/lib/enterpriseConsole";
import { createArServerClient } from "@/lib/ar/appAuth";
import { getAppSupabase } from "@/lib/appSupabase";
import { getClientIp, rlHit } from "@/lib/rate-limit";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface Guarded {
  owner: OrgView;
  /** Service role. GoTrue operations only — creating a user, a password, a ban. */
  admin: SupabaseClient;
  /**
   * The signed-in owner. Every enterprise_* RPC authorises on auth.uid(), so
   * calling one with the service client would look like an anonymous caller
   * and be refused with not_org_owner. Use this for those.
   */
  asOwner: SupabaseClient;
}

export type GuardFailure = { error: string; status: number };

export function isFailure(x: Guarded | GuardFailure): x is GuardFailure {
  return (x as GuardFailure).error !== undefined;
}

/**
 * `targetUserId` is checked against the owner's OWN roster, which came from
 * enterprise_my_org() under RLS — so a forged id simply is not in the list.
 */
export async function guardSeatRoute(
  req: Request,
  targetUserId?: string,
): Promise<Guarded | GuardFailure> {
  const owner = await getOrgOwner();
  if (!owner) return { error: "Sign in as the person who bought the plan.", status: 401 };

  // Password resets and user creation are worth slowing down even for a
  // legitimate owner: 20 seat operations in 5 minutes is far past normal use.
  const rl = await rlHit(`ent:${owner.org.id}:${getClientIp(req)}`, 20, 300);
  if (!rl.allowed) {
    return { error: "Too many changes at once. Give it a minute.", status: 429 };
  }

  if (targetUserId) {
    const seat = owner.seats.find((s) => s.user_id === targetUserId);
    if (!seat) return { error: "That person is not on your plan.", status: 404 };
    if (seat.role === "owner") {
      return { error: "You cannot do that to your own account.", status: 400 };
    }
  }

  const admin = getAppSupabase();
  if (!admin) return { error: "Server is not configured for seat management.", status: 500 };

  const asOwner = await createArServerClient();
  return { owner, admin, asOwner };
}
