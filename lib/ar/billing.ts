/**
 * Server-side AR token billing. AR authoring lives on this site but the token
 * ledger (profiles.tokens_used_this_month, consume_tokens / refund_tokens) lives
 * in the KaunTech *app* Supabase project — the same project the AR data uses. We
 * charge through the service-role app client (getAppSupabase) so the spend is
 * server-authoritative; the AR routes themselves use the RLS user client.
 *
 * AR is TIERED: Pro = pre-made templates only; Ultra = the full studio.
 * Token costs (kept in lock-step with the app's plan.tsx AR cost copy):
 *   - Publish a TEMPLATE AR card (Pro) .... AR_COST.buildPro    (60)
 *   - Build a CUSTOM AR card (Ultra) ...... AR_COST.buildUltra  (80)
 *   - Upload a 3D model element (.glb) .... AR_COST.model       (40)  Ultra only
 *   - Upload a video element .............. AR_COST.video      (100)  Ultra only
 *   - Image / audio (custom uploads) ...... Ultra only (gated in /api/ar/asset)
 *   - Text / social / template apply ...... free
 * Custom element uploads are gated to Ultra in /api/ar/asset. Extra AR card slots
 * beyond the plan cap are bought via the app's purchase_bypass RPC ('ar_card',
 * 160 tokens, Ultra only), not here.
 */
import { getAppSupabase } from "@/lib/appSupabase";

export const AR_COST = {
  buildPro: 60,    // Pro: publish a pre-made template card
  buildUltra: 80,  // Ultra: build / publish a custom card
  model: 40,       // Ultra: custom .glb upload
  video: 100,      // Ultra: custom video upload (the only recurring-egress element)
} as const;

export type ArChargeResult =
  | { ok: true; source: string }
  | {
      ok: false;
      reason: "billing_unavailable" | "tier_too_low" | "limit_reached" | "consume_failed";
      used?: number;
      limit?: number;
    };

// Atomically reserve `amount` AR tokens for `userId`. Pro+ only (AR is a paid
// feature). Returns the spend source so a later refund returns tokens to the
// same bucket (monthly allowance vs earned referral pool).
export async function chargeArTokens(userId: string, amount: number, kind = "ar"): Promise<ArChargeResult> {
  if (amount <= 0) return { ok: true, source: "monthly" };
  const admin = getAppSupabase();
  if (!admin) return { ok: false, reason: "billing_unavailable" };

  const { data, error } = await admin.rpc("consume_tokens", {
    p_user: userId,
    p_delta: amount,
    p_kind: kind,
    p_min_tier: "pro",
  });
  if (error) {
    console.warn("[ar/billing] consume_tokens error:", error.message);
    return { ok: false, reason: "consume_failed" };
  }
  if (!data?.ok) {
    const reason = data?.reason === "tier_too_low" || data?.reason === "limit_reached" ? data.reason : "consume_failed";
    return { ok: false, reason, used: data?.used, limit: data?.limit };
  }
  return { ok: true, source: data?.source ?? "monthly" };
}

// Reverse a charge when the action ultimately fails after the tokens were taken
// (e.g. the storage/cap trigger rejects the save). Best-effort; never throws.
export async function refundArTokens(userId: string, amount: number, source = "monthly", kind = "ar"): Promise<void> {
  if (amount <= 0) return;
  const admin = getAppSupabase();
  if (!admin) return;
  const { error } = await admin.rpc("refund_tokens", {
    p_user: userId,
    p_delta: amount,
    p_kind: kind,
    p_source: source,
  });
  if (error) console.warn("[ar/billing] refund_tokens error:", error.message);
}

// Map a failed charge to an HTTP response shape the AR routes can return.
export function chargeErrorResponse(r: Extract<ArChargeResult, { ok: false }>): { error: string; status: number } {
  switch (r.reason) {
    case "billing_unavailable":
      return { error: "Billing is temporarily unavailable. Please try again in a moment.", status: 503 };
    case "tier_too_low":
      return { error: "AR cards are a Pro / Ultra feature. Upgrade in the app to set one up.", status: 403 };
    case "limit_reached":
      return { error: "You're out of tokens. Top up in the app to keep building in AR.", status: 402 };
    default:
      return { error: "Could not reserve tokens. Please try again.", status: 500 };
  }
}
