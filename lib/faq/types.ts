/** Shared types for the site-wide marketing FAQ (DB rows <-> rendered Q&A). */

export type FaqStatus = "draft" | "published" | "archived";

/**
 * One question/answer pair — the minimal shape used by the accordion UI and
 * the FAQPage JSON-LD. (Same `{q,a}` shape the blog's per-post FAQ uses, so a
 * single buildFaqLd() serves both.)
 */
export interface FaqQA {
  q: string;
  a: string;
}

/** A full site FAQ row as stored in / returned from Supabase (`site_faqs`). */
export interface SiteFaq {
  id: string;
  slug: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  status: FaqStatus;
  created_at: string;
  updated_at: string;
}

/**
 * One FAQ in a write to POST /api/faq (from the kauntech-admin FAQ manager).
 * `slug` is derived from the question when omitted.
 */
export interface FaqUpsert {
  slug?: string;
  question: string;
  answer: string;
  category?: string | null;
  sort_order?: number;
  status?: FaqStatus;
}
