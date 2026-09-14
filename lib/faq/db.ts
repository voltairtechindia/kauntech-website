/**
 * Supabase data access for the site-wide marketing FAQ. All calls go through
 * the shared server-side service-role client (RLS-protected; the browser never
 * reads the DB directly — the FAQ renders server-side and the admin FAQ
 * manager posts to /api/faq).
 */
import { getSupabase } from "@/lib/rag/supabase";

import type { FaqQA, FaqUpsert, SiteFaq } from "./types";

/**
 * Fallback FAQ used if `site_faqs` is empty or unavailable — e.g. before
 * migration 0017 is applied, or if a DB hiccup occurs. Keeps the homepage
 * teaser, the /faq page, and the FAQPage JSON-LD working no matter what.
 * Mirrors the rows seeded by migration 0017.
 */
export const DEFAULT_FAQS: FaqQA[] = [
  {
    q: "What is Kauntech?",
    a: "Kauntech is an AI-powered business card scanner for Android and iOS with offline-first scanning. It uses on-device OCR to read visiting cards, enriches contacts with AI, and routes leads to your CRM, Google Sheets, or WhatsApp — in under 30 seconds. Cloud backup is optional and you choose what syncs.",
  },
  {
    q: "Does Kauntech work without internet?",
    a: "Yes. Kauntech is built offline-first — scanning, processing, and saving contacts all work with zero internet connection. A brief connection is only needed when you choose to sync to a CRM or run AI enrichment.",
  },
  {
    q: "Is Kauntech DPDP Act 2023 compliant?",
    a: "Yes. All card processing happens on your device and your scanned contacts are never uploaded to Kauntech's servers, satisfying the DPDP Act 2023 principle of data minimisation by design.",
  },
  {
    q: "Where is my scanned contact data stored?",
    a: "On your device only, in AES-256 encrypted local storage. We do not save or store your scanned images or contact details on our servers.",
  },
  {
    q: "What is a K-Token?",
    a: "A K-Token is Kauntech's AI credit unit. Tokens power on-device AI features such as AI Intel enrichment, AI Fix, and AI Strategy, and are only consumed when you actively use an AI feature.",
  },
  {
    q: "How much does Kauntech cost?",
    a: "Kauntech offers a free plan with 49 scans and 100 K-Tokens per month. Paid plans are billed yearly: Pro at ₹1,499/year and Ultra at ₹2,499/year, plus an Enterprise plan priced per user (5 user minimum).",
  },
];

/** Published FAQ rows, in manual display order. Throws on DB error. */
export async function listPublishedFaqs(): Promise<SiteFaq[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("site_faqs")
    .select("*")
    .eq("status", "published")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SiteFaq[];
}

/** Every FAQ row (any status), for the admin manager. Throws on DB error. */
export async function listAllFaqs(): Promise<SiteFaq[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("site_faqs")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SiteFaq[];
}

/**
 * Published FAQs as `{q,a}` pairs for rendering + JSON-LD, with a safe
 * fallback to DEFAULT_FAQS if the table is empty or unreadable. `limit`
 * trims to the first N (used by the homepage teaser).
 */
export async function getFaqPairs(limit?: number): Promise<FaqQA[]> {
  let pairs: FaqQA[];
  try {
    const rows = await listPublishedFaqs();
    pairs = rows.length
      ? rows.map((r) => ({ q: r.question, a: r.answer }))
      : DEFAULT_FAQS;
  } catch {
    // Table missing (pre-migration) or transient error → never break the page.
    pairs = DEFAULT_FAQS;
  }
  return typeof limit === "number" ? pairs.slice(0, limit) : pairs;
}

/** Upsert a single FAQ by slug. Returns the stored row. */
export async function upsertFaq(
  row: FaqUpsert & { slug: string },
): Promise<SiteFaq> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("site_faqs")
    .upsert(row, { onConflict: "slug" })
    .select("*")
    .single();
  if (error) throw error;
  return data as SiteFaq;
}

/** Slugs of all currently-stored FAQs (used to prune removed entries). */
export async function listAllFaqSlugs(): Promise<string[]> {
  const sb = getSupabase();
  const { data, error } = await sb.from("site_faqs").select("slug");
  if (error) throw error;
  return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
}

/** Delete FAQ rows by slug. No-op on an empty list. */
export async function deleteFaqs(slugs: string[]): Promise<void> {
  if (!slugs.length) return;
  const sb = getSupabase();
  const { error } = await sb.from("site_faqs").delete().in("slug", slugs);
  if (error) throw error;
}
