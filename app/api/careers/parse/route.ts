/**
 * Admin-gated resume re-parse endpoint. Lets the admin panel re-run the AI
 * parse + embedding for an application (e.g. after a parse error, or a new
 * model) without duplicating the parse logic across apps. The initial parse
 * runs automatically in /api/careers/apply.
 *
 * Auth: header  X-Admin-Key: <ADMIN_API_KEY>
 * POST /api/careers/parse  { application_id }  -> { ok, id }
 */
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { runParse } from "@/lib/careers/parse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { detail: "Invalid or missing X-Admin-Key." },
      { status: 401 },
    );
  }

  let body: { application_id?: string };
  try {
    body = (await req.json()) as { application_id?: string };
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const id = typeof body.application_id === "string" ? body.application_id.trim() : "";
  if (!id) {
    return NextResponse.json(
      { detail: "application_id is required." },
      { status: 400 },
    );
  }

  try {
    await runParse(id);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("[careers] reparse failed", err);
    return NextResponse.json(
      { detail: err instanceof Error ? err.message : "Re-parse failed." },
      { status: 500 },
    );
  }
}
