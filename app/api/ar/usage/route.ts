/**
 * Live AR storage usage for the signed-in owner, so the editor can refresh its
 * storage meter after each model/image upload (the bytes are tallied by a
 * storage.objects trigger into profiles.cloud_ar_bytes - see the
 * 20260619120000_ar_models migration). Authed; RLS scopes the read.
 *
 * GET /api/ar/usage -> 200 { ok:true, usedBytes, capBytes, tier } | 401 { ok:false }
 */
import { NextResponse } from "next/server";
import { getArUsage } from "@/lib/ar/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const usage = await getArUsage();
  if (!usage) return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  return NextResponse.json({ ok: true, ...usage });
}
