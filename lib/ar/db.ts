/**
 * Server-side data access for the /ar studio. Everything runs through the
 * AUTHED server client (createArServerClient) so Postgres RLS scopes reads and
 * writes to the signed-in owner — no service-role needed in this path. The
 * ar_models count/byte caps are enforced by triggers in the app project
 * (migration 20260619120000_ar_models.sql).
 */
import { createArServerClient } from "@/lib/ar/appAuth";

export type ArSource = "template" | "generated" | "upload";

export interface OwnerCard {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  avatar_url: string | null;
  card_color: string | null;
  is_default: boolean;
  custom_qr_url: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

const CARD_COLUMNS =
  "id, name, title, company, avatar_url, card_color, is_default, custom_qr_url, phone, email, website";

export interface ArModel {
  id: string;
  card_id: string;
  name: string | null;
  source: ArSource;
  template_key: string | null;
  scene: Record<string, unknown>;
  glb_path: string | null;
  usdz_path: string | null;
  reference_image_path: string | null;
  poster_path: string | null;
  scale: number;
  orientation: { x: number; y: number; z: number };
  is_default: boolean;
  is_published: boolean;
  updated_at: string;
}

/** Effective tier mirroring the app's hooks/useProfile.ts effectiveTier(). */
export type EffectiveTier = "free" | "pro" | "ultra";

export const AR_MODEL_CAPS: Record<EffectiveTier, number> = {
  free: 0,
  pro: 1,
  ultra: 3,
};

export interface DashboardData {
  email: string | null;
  tier: EffectiveTier;
  arCap: number;
  cards: OwnerCard[];
  models: Record<string, ArModel>; // keyed by card_id
  /** True when the cards read failed (auth/transient) — distinct from an owner
   *  who genuinely has zero cards, so the UI can show "couldn't load" not
   *  "No cards yet". */
  loadError: boolean;
}

function effectiveTier(subscription_tier: string | null, trial_ends_at: string | null): EffectiveTier {
  if (trial_ends_at && new Date(trial_ends_at).getTime() > Date.now()) return "pro";
  if (subscription_tier === "ultra" || subscription_tier === "max") return "ultra";
  if (subscription_tier === "pro") return "pro";
  return "free";
}

/** Cards + their current AR model + the owner's tier/cap, for the dashboard. */
export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createArServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: cards, error: cardsError }, { data: models }] = await Promise.all([
    supabase.from("profiles").select("subscription_tier, trial_ends_at").eq("id", user.id).single(),
    supabase
      .from("cards")
      .select(CARD_COLUMNS)
      .eq("user_id", user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("ar_models")
      .select(
        "id, card_id, name, source, template_key, scene, glb_path, usdz_path, reference_image_path, poster_path, scale, orientation, is_default, is_published, updated_at",
      )
      .eq("user_id", user.id),
  ]);

  const tier = effectiveTier(profile?.subscription_tier ?? null, profile?.trial_ends_at ?? null);
  const byCard: Record<string, ArModel> = {};
  for (const m of (models ?? []) as ArModel[]) byCard[m.card_id] = m;

  return {
    email: user.email ?? null,
    tier,
    arCap: AR_MODEL_CAPS[tier],
    cards: (cards ?? []) as OwnerCard[],
    models: byCard,
    loadError: !!cardsError,
  };
}

/** A single card + its AR model, for the editor. Returns null if not the owner. */
export async function getCardForEditor(
  cardId: string,
): Promise<{ email: string | null; tier: EffectiveTier; card: OwnerCard; model: ArModel | null } | null> {
  const supabase = await createArServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: card } = await supabase
    .from("cards")
    .select(CARD_COLUMNS)
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();
  if (!card) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, trial_ends_at")
    .eq("id", user.id)
    .single();

  const { data: model } = await supabase
    .from("ar_models")
    .select(
      "id, card_id, name, source, template_key, scene, glb_path, usdz_path, reference_image_path, poster_path, scale, orientation, is_default, is_published, updated_at",
    )
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    email: user.email ?? null,
    tier: effectiveTier(profile?.subscription_tier ?? null, profile?.trial_ends_at ?? null),
    card: card as OwnerCard,
    model: (model as ArModel) ?? null,
  };
}
