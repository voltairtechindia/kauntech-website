/**
 * The editable half of a lead: the row as a form, and the form back as a patch.
 *
 * Client-safe — no `next/headers`, no Supabase import — so the drawer, the new
 * lead dialog and the bulk bar all shape a write the same way. Everything the
 * console writes goes through `patchFromDraft`, which is the only place that
 * knows a tag list is jsonb and a phone list is one per line.
 *
 * What is deliberately NOT here: user_id and org_id. Postgres pins both on an
 * org row (stamp_org_id), so "who scanned it" cannot be edited from anywhere,
 * and a patch that tried would be refused rather than silently ignored.
 */
import type { Temperature } from "@/lib/enterpriseTypes";

export interface LeadDraft {
  name: string;
  title: string;
  company: string;
  email: string;
  extraEmails: string;   // one per line
  phone: string;
  extraPhones: string;   // one per line
  website: string;
  linkedin: string;
  address: string;
  conference: string;
  notes: string;
  temperature: Temperature | "";
  /** "YYYY-MM-DD", or "" when the stored value is AI free text (see note). */
  followUpDate: string;
  /** What AI Strategy wrote, when it is not a date: "In 5 days". Kept unless replaced. */
  followUpNote: string;
  tags: string;          // comma separated
  products: string;      // comma separated
  assigned: string;      // comma separated
  /** Existing custom fields only; the app owns which keys exist. */
  custom: Record<string, string>;
}

type Row = Record<string, any>;

export const asList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()) : [];

const lines = (s: string): string[] =>
  s.split(/[\n,;]+/).map((x) => x.trim()).filter(Boolean);

const commas = (s: string): string[] =>
  s.split(",").map((x) => x.trim()).filter(Boolean);

const trimOrNull = (s: string): string | null => {
  const t = s.trim();
  return t ? t : null;
};

/** A stored follow-up is a date only when it parses as one; AI writes prose. */
export function splitFollowUp(v: unknown): { date: string; note: string } {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return { date: "", note: "" };
  const t = new Date(s).getTime();
  if (Number.isNaN(t)) return { date: "", note: s };
  const d = new Date(t);
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { date: iso, note: "" };
}

/** Custom field values are a string or a list, per key. Writes keep that shape. */
function customShape(row: Row): Record<string, "list" | "text"> {
  const out: Record<string, "list" | "text"> = {};
  const cf = row?.custom_fields;
  if (cf && typeof cf === "object" && !Array.isArray(cf)) {
    for (const [k, v] of Object.entries(cf)) out[k] = Array.isArray(v) ? "list" : "text";
  }
  return out;
}

export function draftFromLead(row: Row | null): LeadDraft {
  const r = row ?? {};
  const fu = splitFollowUp(r.follow_up_at);
  const custom: Record<string, string> = {};
  const cf = r.custom_fields;
  if (cf && typeof cf === "object" && !Array.isArray(cf)) {
    for (const [k, v] of Object.entries(cf)) {
      custom[k] = Array.isArray(v) ? asList(v).join(", ") : typeof v === "string" ? v : "";
    }
  }
  return {
    name: r.name ?? "",
    title: r.title ?? "",
    company: r.company ?? "",
    email: r.email ?? "",
    extraEmails: asList(r.extra_emails).join("\n"),
    phone: r.phone ?? "",
    extraPhones: asList(r.extra_phones).join("\n"),
    website: r.website ?? "",
    linkedin: r.linkedin ?? "",
    address: r.address ?? "",
    conference: r.conference ?? "",
    notes: r.notes ?? "",
    temperature: (["hot", "warm", "cold"] as string[]).includes(r.lead_temperature) ? r.lead_temperature : "",
    followUpDate: fu.date,
    followUpNote: fu.note,
    tags: asList(r.tags).join(", "),
    products: asList(r.product_of_interest).join(", "),
    assigned: asList(r.assigned_to).join(", "),
    custom,
  };
}

export function emptyDraft(): LeadDraft {
  return draftFromLead(null);
}

/** What goes on the wire. `original` keeps each custom field's stored shape. */
export function patchFromDraft(d: LeadDraft, original: Row | null = null): Row {
  const shape = customShape(original ?? {});
  const custom: Record<string, string | string[]> = {};
  for (const [k, v] of Object.entries(d.custom)) {
    const val = v.trim();
    if (!val) continue;
    custom[k] = shape[k] === "list" ? commas(val) : val;
  }
  return {
    name: d.name.trim() || "Unnamed lead",   // NOT NULL in Postgres
    title: trimOrNull(d.title),
    company: trimOrNull(d.company),
    email: trimOrNull(d.email),
    extra_emails: lines(d.extraEmails),
    phone: trimOrNull(d.phone),
    extra_phones: lines(d.extraPhones),
    website: trimOrNull(d.website),
    linkedin: trimOrNull(d.linkedin),
    address: trimOrNull(d.address),
    conference: trimOrNull(d.conference),
    notes: trimOrNull(d.notes),
    lead_temperature: d.temperature || null,
    // A picked date replaces AI's prose; an untouched draft keeps it.
    follow_up_at: d.followUpDate || d.followUpNote || null,
    tags: commas(d.tags),
    product_of_interest: commas(d.products),
    assigned_to: commas(d.assigned),
    custom_fields: custom,
  };
}

/** True when nothing in the form differs from the row it was built from. */
export function sameDraft(a: LeadDraft, b: LeadDraft): boolean {
  const keys = Object.keys(a) as (keyof LeadDraft)[];
  for (const k of keys) {
    if (k === "custom") {
      const ac = a.custom, bc = b.custom;
      const names = new Set([...Object.keys(ac), ...Object.keys(bc)]);
      for (const n of names) if ((ac[n] ?? "") !== (bc[n] ?? "")) return false;
    } else if (a[k] !== b[k]) return false;
  }
  return true;
}

/**
 * The storage path inside `card-images` for a stored signed URL.
 *
 * Card images live in a private bucket and the app stores a URL signed for a
 * year. Past that it 400s, so the console re-signs from the path rather than
 * showing a broken frame. Returns null for anything that is not one of ours.
 */
export function cardImagePath(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const m = url.match(/\/storage\/v1\/object\/(?:sign|public)\/card-images\/([^?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/** Postgres speaks in codes; an owner needs a sentence. */
export function writeError(err: { message?: string; code?: string } | null | undefined): string {
  const m = err?.message ?? "";
  if (/cloud_contact_limit_reached/.test(m)) return "Your plan's lead storage is full. Delete a few leads, or talk to us about more.";
  if (/cloud_storage_not_available_for_tier/.test(m)) return "This plan cannot store leads in the cloud.";
  if (/row-level security|violates row-level/i.test(m)) return "You can only change leads in your own team's pool.";
  if (/duplicate key/i.test(m)) return "That lead already exists.";
  if (/Failed to fetch|NetworkError/i.test(m)) return "No connection. Check your network and try again.";
  return m || "That did not work. Try again.";
}
