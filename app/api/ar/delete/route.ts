/**
 * Remove the AR layer from one of the owner's cards. The web studio NEVER
 * deletes the underlying business card - those are owned by the app, and a card
 * deleted here would also vanish from the user's app (the AR model cascades off
 * the card, not the other way round). So this only ever drops the ar_models row:
 *   - Card HAS an AR model: drop the ar_models row, freeing a slot against the
 *     plan's AR cap, and best-effort clear the AR assets from storage. The card
 *     itself stays put - both in the cloud and in the app.
 *   - Card has NO AR model: nothing to remove; returns ok as a no-op so the UI
 *     can stay simple. The card is left untouched.
 *
 * (Deleting the card entirely is an app-only action - see the app's delete flow,
 * which warns first because it cascades the AR card away too.)
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

  // Find the AR model, if any. Removing it frees the plan slot and keeps the
  // card. If there's none, there's nothing to do - and we deliberately do NOT
  // delete the card (that's an app-only action), so this is a safe no-op.
  const { data: model } = await supabase
    .from("ar_models")
    .select("id")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!model) return NextResponse.json({ ok: true, noop: true });

  const { error: delErr } = await supabase
    .from("ar_models")
    .delete()
    .eq("id", model.id)
    .eq("user_id", user.id);
  if (delErr) return bad("Could not remove the AR card. Please try again.", 500);

  // Best-effort storage cleanup: AR target photos sit at `${uid}/${cardId}/…`
  // and editor assets at `${uid}/${cardId}/assets/…`. A failure here must not
  // fail the delete - the AR model row is already gone. The card's own data is
  // untouched.
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
    /* ignore - cleanup is best-effort */
  }

  return NextResponse.json({ ok: true });
}
