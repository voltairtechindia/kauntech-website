/**
 * Delete from the owner's AR dashboard. Two cases, both authed (RLS scopes the
 * delete to the owner):
 *   - Card HAS an AR model: drop the ar_models row, which frees a slot against
 *     the plan's AR model cap and leaves the underlying card in place.
 *   - Card has NO AR model (setup never finished): drop the card row itself, so
 *     a half-set-up or abandoned card can actually be cleared from the studio.
 * Either way we best-effort remove the card's uploaded files from storage so a
 * delete frees both the count and the byte budget.
 *
 * POST /api/ar/delete  (application/json)
 *   { card_id }  ->  200 { ok:true } | 4xx { ok:false, error }
 */
import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AR_BUCKET = "ar-models";

function bad(error: string, status = 400) {
  return NextResponse.json({ ok: false, error }, { status });
}

export async function POST(req: Request) {
  const supabase = await createArServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return bad("Not signed in.", 401);

  let cardId = "";
  try {
    const body = (await req.json()) as { card_id?: unknown };
    cardId = typeof body.card_id === "string" ? body.card_id.trim() : "";
  } catch {
    return bad("Expected JSON { card_id }.");
  }
  if (!cardId) return bad("Missing card_id.");

  // Confirm the card belongs to the owner before touching anything.
  const { data: card } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!card) return bad("Card not found.", 404);

  // If there's an AR model, removing it frees the plan slot but keeps the card.
  // If there isn't (setup never finished), there's nothing to "un-AR" — the
  // user wants the card gone, so delete the card row itself.
  const { data: model } = await supabase
    .from("ar_models")
    .select("id")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Always delete both: AR model row first (FK depends on card), then the card
  // itself — so a deleted card truly vanishes from the dashboard.
  if (model) {
    const { error: delErr } = await supabase
      .from("ar_models")
      .delete()
      .eq("id", model.id)
      .eq("user_id", user.id);
    if (delErr) return bad("Could not delete. Please try again.", 500);
  }

  const { error: cardDelErr } = await supabase
    .from("cards")
    .delete()
    .eq("id", cardId)
    .eq("user_id", user.id);
  if (cardDelErr) return bad("Could not delete the card. Please try again.", 500);

  // Best-effort storage cleanup: the card's photos sit at `${uid}/${cardId}/…`
  // and editor assets at `${uid}/${cardId}/assets/…`. A failure here must not
  // fail the delete — the row is already gone.
  try {
    const bucket = supabase.storage.from(AR_BUCKET);
    const prefixes = [`${user.id}/${cardId}`, `${user.id}/${cardId}/assets`];
    const paths: string[] = [];
    for (const prefix of prefixes) {
      const { data: files } = await bucket.list(prefix, { limit: 100 });
      for (const f of files ?? []) {
        if (f.id) paths.push(`${prefix}/${f.name}`); // entries with an id are files, not folders
      }
    }
    if (paths.length) await bucket.remove(paths);
  } catch {
    /* ignore — cleanup is best-effort */
  }

  return NextResponse.json({ ok: true });
}
