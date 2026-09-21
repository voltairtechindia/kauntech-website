/**
 * Leads out of the console: CSV for a spreadsheet, vCard for a phone or a CRM,
 * plain text for a paste into chat.
 *
 * Pure string work and no imports, so the export route (whole pool, streamed
 * from the server) and the drawer (one lead, built in the browser) produce
 * byte-identical files instead of two formats that drift.
 */

type Row = Record<string, any>;

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()) : [];

/* ───────────────────────────── CSV ───────────────────────────── */

export function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  // Formula injection: a cell starting with = + - @ is executed by spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export const CSV_HEADER = [
  "Name", "Title", "Company", "Email", "Other emails", "Phone", "Other phones", "Website", "LinkedIn",
  "Address", "Event", "Temperature", "Lead score", "Industry", "Company size", "Location", "Tags",
  "Products", "Assigned to", "Notes", "Scanned by", "Scanned at", "Follow up",
];

export function csvRow(r: Row, scannedBy: string): string {
  return [
    r.name, r.title, r.company, r.email, list(r.extra_emails).join("; "), r.phone, list(r.extra_phones).join("; "),
    r.website, r.linkedin, r.address, r.conference, r.lead_temperature, r.lead_score, r.industry, r.company_size,
    r.lead_location, list(r.tags).join("; "), list(r.product_of_interest).join("; "), list(r.assigned_to).join("; "),
    r.notes, scannedBy, r.scanned_at, r.follow_up_at,
  ].map(csvCell).join(",");
}

export function csvFor(rows: Row[], scannedBy: (r: Row) => string): string {
  const lines = [CSV_HEADER.map(csvCell).join(",")];
  for (const r of rows) lines.push(csvRow(r, scannedBy(r)));
  // BOM so Excel opens UTF-8 names (Devanagari, accents) correctly.
  return "﻿" + lines.join("\r\n");
}

/* ───────────────────────────── vCard ───────────────────────────── */

/** RFC 6350 escaping: backslash, comma, semicolon, newline — in that order. */
function vEsc(v: unknown): string {
  return String(v ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r?\n/g, "\\n");
}

const url = (v: string): string => (/^https?:\/\//i.test(v) ? v : `https://${v}`);

/**
 * One lead as vCard 3.0 — the version phones and Outlook agree on. A single
 * N line is guessed from the display name; nothing else is invented.
 */
export function vcardFor(r: Row, scannedBy?: string): string {
  const name = String(r.name ?? "").trim() || "Unnamed lead";
  const parts = name.split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;

  const out = ["BEGIN:VCARD", "VERSION:3.0", `N:${vEsc(last)};${vEsc(first)};;;`, `FN:${vEsc(name)}`];
  if (r.company) out.push(`ORG:${vEsc(r.company)}`);
  if (r.title) out.push(`TITLE:${vEsc(r.title)}`);

  const phones = [r.phone, ...list(r.extra_phones)].filter(Boolean) as string[];
  phones.forEach((p, i) => out.push(`TEL;TYPE=${i === 0 ? "CELL,PREF" : "WORK"}:${vEsc(p)}`));

  const emails = [r.email, ...list(r.extra_emails)].filter(Boolean) as string[];
  emails.forEach((e, i) => out.push(`EMAIL;TYPE=INTERNET${i === 0 ? ",PREF" : ""}:${vEsc(e)}`));

  if (r.website) out.push(`URL:${vEsc(url(String(r.website)))}`);
  if (r.linkedin) out.push(`URL;TYPE=LinkedIn:${vEsc(url(String(r.linkedin)))}`);
  if (r.address) out.push(`ADR;TYPE=WORK:;;${vEsc(r.address)};;;;`);

  // Everything a contacts app has no field for goes in the note, so nothing is lost.
  const note: string[] = [];
  if (r.notes) note.push(String(r.notes));
  if (r.conference) note.push(`Event: ${r.conference}`);
  if (r.lead_temperature) note.push(`Temperature: ${r.lead_temperature}`);
  if (list(r.tags).length) note.push(`Tags: ${list(r.tags).join(", ")}`);
  if (list(r.product_of_interest).length) note.push(`Products: ${list(r.product_of_interest).join(", ")}`);
  if (list(r.assigned_to).length) note.push(`Assigned to: ${list(r.assigned_to).join(", ")}`);
  if (scannedBy) note.push(`Scanned by ${scannedBy}`);
  if (note.length) out.push(`NOTE:${vEsc(note.join("\n"))}`);

  if (r.scanned_at) out.push(`REV:${new Date(r.scanned_at).toISOString().replace(/\.\d{3}/, "")}`);
  out.push("END:VCARD");
  // CRLF, per spec: some Windows importers reject bare LF.
  return out.join("\r\n");
}

export function vcardsFor(rows: Row[], scannedBy: (r: Row) => string): string {
  return rows.map((r) => vcardFor(r, scannedBy(r))).join("\r\n") + "\r\n";
}

/* ───────────────────────────── plain text ───────────────────────────── */

/** For the clipboard: what you would type into a message about this lead. */
export function textFor(r: Row, scannedBy?: string): string {
  const out: string[] = [String(r.name ?? "").trim() || "Unnamed lead"];
  const sub = [r.title, r.company].filter(Boolean).join(" · ");
  if (sub) out.push(sub);
  out.push("");
  for (const p of [r.phone, ...list(r.extra_phones)].filter(Boolean)) out.push(`Phone: ${p}`);
  for (const e of [r.email, ...list(r.extra_emails)].filter(Boolean)) out.push(`Email: ${e}`);
  if (r.website) out.push(`Website: ${r.website}`);
  if (r.linkedin) out.push(`LinkedIn: ${r.linkedin}`);
  if (r.address) out.push(`Address: ${r.address}`);
  if (r.conference) out.push(`Event: ${r.conference}`);
  if (list(r.tags).length) out.push(`Tags: ${list(r.tags).join(", ")}`);
  if (list(r.product_of_interest).length) out.push(`Products: ${list(r.product_of_interest).join(", ")}`);
  if (list(r.assigned_to).length) out.push(`Assigned to: ${list(r.assigned_to).join(", ")}`);
  if (r.notes) out.push("", String(r.notes));
  if (scannedBy) out.push("", `Scanned by ${scannedBy}`);
  return out.join("\n");
}

/* ───────────────────────────── filenames ───────────────────────────── */

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function exportFilename(label: string, ext: "csv" | "vcf"): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${slugify(label) || "leads"}-${day}.${ext}`;
}
