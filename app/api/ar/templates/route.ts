/**
 * AR templates for the signed-in owner.
 *
 *   GET  /api/ar/templates            -> { ok, global: ArTemplate[], own: ArTemplate[] }
 *   POST /api/ar/templates {name,scene} -> { ok, template }   (saves a PERSONAL template)
 *
 * Global ("Default") templates are read here but only written from the
 * kauntech-admin panel (service role). RLS scopes everything to the owner.
 */
import { NextResponse } from "next/server";
import { listArTemplates, saveArTemplate } from "@/lib/ar/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_NAME = 60;

export async function GET() {
  const { global, own } = await listArTemplates();
  return NextResponse.json({ ok: true, global, own });
}

export async function POST(req: Request) {
  let body: { name?: unknown; scene?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Expected JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_NAME) : "";
  if (!name) return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });

  const scene = body.scene;
  const elements = (scene as { elements?: unknown } | null)?.elements;
  if (!scene || typeof scene !== "object" || !Array.isArray(elements) || elements.length === 0) {
    return NextResponse.json(
      { ok: false, error: "Add at least one element before saving a template." },
      { status: 400 },
    );
  }

  const result = await saveArTemplate(name, scene as Record<string, unknown>);
  if (!result.ok) return NextResponse.json(result, { status: result.error === "Not signed in." ? 401 : 500 });
  return NextResponse.json({ ok: true, template: result.template });
}
