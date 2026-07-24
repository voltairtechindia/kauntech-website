/**
 * DELETE /api/ar/templates/:id - remove one of the owner's PERSONAL templates.
 * RLS (and the is_global=false filter) make it impossible to delete a global
 * "Default" template here; those are managed only from the admin panel.
 */
import { NextResponse } from "next/server";
import { deleteArTemplate } from "@/lib/ar/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id." }, { status: 400 });
  const ok = await deleteArTemplate(id);
  if (!ok) return NextResponse.json({ ok: false, error: "Could not delete." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
