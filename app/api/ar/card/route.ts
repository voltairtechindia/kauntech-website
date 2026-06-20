/**
 * Create a new business card for the owner, straight from the AR studio, so a
 * user can spin up another AR card without leaving the web. The card is a normal
 * row in the app's `cards` table (RLS scopes it to the owner); AR is then
 * composed in the editor and saved as an ar_models row.
 *
 * Capped to the plan's AR allowance (Pro 1 / Ultra 3) by counting existing AR
 * models — you can't create cards beyond what you could ever publish.
 *
 * POST /api/ar/card  ->  200 { ok:true, card_id } | 4xx { ok:false, error }
 */
import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";
import { AR_MODEL_CAPS, type EffectiveTier } from "@/lib/ar/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

function effectiveTier(subscription_tier: string | null, trial_ends_at: string | null): EffectiveTier {
  if (trial_ends_at && new Date(trial_ends_at).getTime() > Date.now()) return "pro";
  if (subscription_tier === "ultra" || subscription_tier === "max") return "ultra";
  if (subscription_tier === "pro") return "pro";
  return "free";
}

export async function POST() {
  const supabase = await createArServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("Not signed in.", 401);

  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("subscription_tier, trial_ends_at, full_name").eq("id", user.id).single(),
    supabase.from("ar_models").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const tier = effectiveTier(profile?.subscription_tier ?? null, profile?.trial_ends_at ?? null);
  const cap = AR_MODEL_CAPS[tier];
  if (cap <= 0) return bad("AR cards are a Pro / Ultra feature.", 403);
  if ((count ?? 0) >= cap) {
    return bad(`You've reached your plan's limit of ${cap} AR ${cap === 1 ? "card" : "cards"}.`, 403);
  }

  const name = (profile?.full_name ?? "").trim() || "My AR card";
  const { data: card, error } = await supabase
    .from("cards")
    .insert({ user_id: user.id, name })
    .select("id")
    .single();
  if (error || !card) return bad("Could not create the card. Please try again.", 500);

  return NextResponse.json({ ok: true, card_id: card.id });
}
