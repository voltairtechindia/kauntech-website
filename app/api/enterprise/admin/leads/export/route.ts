import { NextResponse } from "next/server";
import { createArServerClient } from "@/lib/ar/appAuth";
import { getOrgOwner } from "@/lib/enterpriseConsole";
import { applyLeadFilters } from "@/lib/enterpriseLeads";
import { parseLeadFilters, seatName } from "@/lib/enterpriseTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Plenty for a team's pool; a guard, not a product limit.
const EXPORT_CAP = 20_000;
const PAGE = 1000;

/**
 * The team's leads as a CSV the owner can open in Excel or Sheets. Runs as the
 * signed-in owner — the same RLS that shapes the Leads page — with the same
 * filters, so "export" always means "what I am looking at".
 */

const list = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).join("; ") : "");

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Formula injection: a cell starting with = + - @ is executed by spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(req: Request) {
  const owner = await getOrgOwner();
  if (!owner) return NextResponse.json({ error: "Sign in as the person who manages the plan." }, { status: 401 });

  const url = new URL(req.url);
  const filters = parseLeadFilters(Object.fromEntries(url.searchParams));
  const names = new Map(owner.seats.map((s) => [s.user_id, seatName(s)]));

  const sb = await createArServerClient();
  const rows: any[] = [];
  for (let from = 0; from < EXPORT_CAP; from += PAGE) {
    const base = sb.from("contacts").select("*").eq("org_id", owner.org.id);
    const { data, error } = await applyLeadFilters(base, filters)
      .order("scanned_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const header = [
    "Name", "Title", "Company", "Email", "Other emails", "Phone", "Other phones", "Website", "LinkedIn",
    "Address", "Event", "Temperature", "Lead score", "Industry", "Company size", "Location", "Tags",
    "Products", "Assigned to", "Notes", "Scanned by", "Scanned at", "Follow up",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const r of rows) {
    lines.push([
      r.name, r.title, r.company, r.email, list(r.extra_emails), r.phone, list(r.extra_phones), r.website,
      r.linkedin, r.address, r.conference, r.lead_temperature, r.lead_score, r.industry, r.company_size,
      r.lead_location, list(r.tags), list(r.product_of_interest), list(r.assigned_to), r.notes,
      names.get(r.user_id) ?? "Former member", r.scanned_at, r.follow_up_at,
    ].map(csvCell).join(","));
  }

  const slug = owner.org.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
  const day = new Date().toISOString().slice(0, 10);
  // BOM so Excel opens UTF-8 names (Devanagari, accents) correctly.
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}-leads-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
