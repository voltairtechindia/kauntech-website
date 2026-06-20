/**
 * Remove the AR experience attached to one of the owner's cards. Deletes the
 * ar_models row (freeing a slot against the plan's AR model cap) and best-effort
 * removes the card's uploaded files from storage so deleting frees both the
 * count and the byte budget. Authed — RLS scopes the delete to the owner.
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

  // Confirm ownership and that there's actually a model to remove.
  const { data: model } = await supabase
    .from("ar_models")
    .select("id")
    .eq("card_id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!model) return bad("No AR experience on this card.", 404);

  const { error: delErr } = await supabase
    .from("ar_models")
    .delete()
    .eq("id", model.id)
    .eq("user_id", user.id);
  if (delErr) return bad("Could not delete. Please try again.", 500);

  // Best-effort storage cleanup: the card's photos sit at `${uid}/${cardId}/…`
  // and editor assets at `${uid}/${cardId}/assets/…`. A failure here must not
  // fail the delete — the row (and the plan slot) is already gone.
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
