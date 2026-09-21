import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";
import { getOrgOwner } from "@/lib/enterpriseConsole";
import { applyLeadFilters } from "@/lib/enterpriseLeads";
import { csvFor, exportFilename, vcardsFor } from "@/lib/enterpriseLeadExport";
import { parseLeadFilters, seatName } from "@/lib/enterpriseTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Plenty for a team's pool; a guard, not a product limit.
const EXPORT_CAP = 20_000;
const PAGE = 1000;
// A hand-picked set travels in the URL, so it is capped by what a URL holds.
const IDS_CAP = 500;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The team's leads as a file the owner can open elsewhere: CSV for Excel and
 * Sheets, vCard for a phone or a CRM. Runs as the signed-in owner — the same
 * RLS that shapes the Leads page — with the same filters, so "export" always
 * means "what I am looking at". `ids` narrows it further to a hand-picked set.
 */
export async function GET(req: Request) {
  const owner = await getOrgOwner();
  if (!owner) return NextResponse.json({ error: "Sign in as the person who manages the plan." }, { status: 401 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "vcf" ? "vcf" : "csv";
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => UUID.test(s))
    .slice(0, IDS_CAP);
  const filters = parseLeadFilters(Object.fromEntries(url.searchParams));
  const names = new Map(owner.seats.map((s) => [s.user_id, seatName(s)]));
  const nameOf = (r: any) => names.get(r.user_id) ?? "Former member";

  const sb = await createArServerClient();
  const rows: any[] = [];
  for (let from = 0; from < EXPORT_CAP; from += PAGE) {
    const base = sb.from("contacts").select("*").eq("org_id", owner.org.id);
    // A picked set is exactly that set; filters only shape the "everything" case.
    const scoped = ids.length ? base.in("id", ids) : applyLeadFilters(base, filters);
    const { data, error } = await scoped.order("scanned_at", { ascending: false }).range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const body = format === "vcf" ? vcardsFor(rows, nameOf) : csvFor(rows, nameOf);
  const filename = exportFilename(`${owner.org.name}-leads`, format);

  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "vcf" ? "text/vcard; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
