/**
 * Admin-gated site-FAQ endpoint — the kauntech-admin FAQ manager's target.
 * Replaces the marketing FAQ (the `{q,a}` list shown on the homepage teaser +
 * the /faq page) AND mirrors each published entry into the RAG store
 * (doc_type "site_faq") so the chatbot answers from the same edited copy.
 * Service-role + Gemini keys stay server-side; the admin only needs
 * ADMIN_API_KEY.
 *
 * Auth: header  X-Admin-Key: <ADMIN_API_KEY>
 *
 * POST /api/faq
 *   Body: { "faqs": [ { question, answer, category?, status?, sort_order?, slug? }, ... ] }
 *         (a single FAQ object is also accepted). The list is treated as the
 *         FULL desired set: entries are upserted by slug in order, and any
 *         previously-stored FAQ whose slug is absent is DELETED (so removals
 *         in the admin propagate). Omitted sort_order defaults to list index.
 *   -> 200 { ok, count, removed, faqs: [{ slug, status }] }
 *
 * GET  /api/faq            -> { total, published, draft, archived }
 * DELETE /api/faq?slug=... -> removes one FAQ + its RAG document
 *
 * On success the site's ISR caches for "/" and "/faq" are revalidated, so
 * edits go live immediately without waiting out the revalidate window.
 */
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { slugify } from "@/lib/blog/util";
import {
  deleteFaqs,
  listAllFaqSlugs,
  upsertFaq,
} from "@/lib/faq/db";
import type { FaqUpsert, SiteFaq } from "@/lib/faq/types";
import { deleteDocument } from "@/lib/rag/db";
import { ingest } from "@/lib/rag/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUS = new Set(["draft", "published", "archived"]);
const RAG_DOC_TYPE = "site_faq";

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Validate + normalise one incoming FAQ. Returns the row or an error string. */
function normalize(
  input: unknown,
  index: number,
): { row: FaqUpsert & { slug: string } } | { error: string } {
  if (typeof input !== "object" || input === null) {
    return { error: "Each FAQ must be an object." };
  }
  const p = input as Record<string, unknown>;

  const question = str(p.question) || str(p.q);
  const answer = str(p.answer) || str(p.a);
  if (!question) return { error: "question is required." };
  if (!answer) return { error: `answer is required for "${question}".` };

  const slug = slugify(str(p.slug) || question);
  if (!slug) return { error: `Could not derive a slug for "${question}".` };

  const status = str(p.status) || "published";
  if (!VALID_STATUS.has(status)) {
    return { error: `Invalid status "${status}".` };
  }

  const sort_order =
    typeof p.sort_order === "number" && Number.isFinite(p.sort_order)
      ? Math.round(p.sort_order)
      : (index + 1) * 10;

  return {
    row: {
      slug,
      question,
      answer,
      category: str(p.category) || null,
      sort_order,
      status: status as FaqUpsert["status"],
    },
  };
}

/** Mirror a stored FAQ into the RAG store (or remove it if not published). */
async function syncRag(faq: SiteFaq): Promise<void> {
  if (faq.status !== "published") {
    await deleteDocument(RAG_DOC_TYPE, faq.slug);
    return;
  }
  await ingest([
    {
      doc_type: RAG_DOC_TYPE,
      external_id: faq.slug,
      title: faq.question,
      content: `Q: ${faq.question}\nA: ${faq.answer}`,
      metadata: {
        slug: faq.slug,
        category: faq.category,
        url: `https://www.kauntech.com/faq#${faq.slug}`,
      },
    },
  ]);
}

export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { detail: "Invalid or missing X-Admin-Key." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const raw =
    body &&
    typeof body === "object" &&
    Array.isArray((body as Record<string, unknown>).faqs)
      ? ((body as Record<string, unknown>).faqs as unknown[])
      : [body];

  if (!raw.length) {
    return NextResponse.json({ detail: "No FAQs provided." }, { status: 400 });
  }

  // Validate everything up front so a bad entry doesn't leave a partial write.
  const rows: (FaqUpsert & { slug: string })[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.length; i++) {
    const parsed = normalize(raw[i], i);
    if ("error" in parsed) {
      return NextResponse.json({ detail: parsed.error }, { status: 400 });
    }
    if (seen.has(parsed.row.slug)) {
      return NextResponse.json(
        { detail: `Duplicate question / slug "${parsed.row.slug}".` },
        { status: 400 },
      );
    }
    seen.add(parsed.row.slug);
    rows.push(parsed.row);
  }

  try {
    // Prune FAQs the admin removed (present in DB, absent from this payload).
    const existing = await listAllFaqSlugs();
    const removedSlugs = existing.filter((s) => !seen.has(s));

    const stored: SiteFaq[] = [];
    for (const row of rows) stored.push(await upsertFaq(row));

    // RAG: (re)ingest published entries, drop drafts + removed entries.
    for (const faq of stored) await syncRag(faq);
    for (const slug of removedSlugs) await deleteDocument(RAG_DOC_TYPE, slug);
    await deleteFaqs(removedSlugs);

    // Push the changes live now instead of waiting out the ISR window.
    revalidatePath("/");
    revalidatePath("/faq");

    return NextResponse.json({
      ok: true,
      count: stored.length,
      removed: removedSlugs.length,
      faqs: stored.map((f) => ({ slug: f.slug, status: f.status })),
    });
  } catch (err) {
    console.error("[faq] upsert failed", err);
    return NextResponse.json(
      { detail: "Could not save the FAQ." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { detail: "Invalid or missing X-Admin-Key." },
      { status: 401 },
    );
  }
  try {
    const { getSupabase } = await import("@/lib/rag/supabase");
    const sb = getSupabase();
    const { data, error } = await sb.from("site_faqs").select("status");
    if (error) throw error;
    const r = (data ?? []) as { status: string }[];
    return NextResponse.json({
      total: r.length,
      published: r.filter((x) => x.status === "published").length,
      draft: r.filter((x) => x.status === "draft").length,
      archived: r.filter((x) => x.status === "archived").length,
    });
  } catch (err) {
    console.error("[faq] count failed", err);
    return NextResponse.json({ detail: "Count failed." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { detail: "Invalid or missing X-Admin-Key." },
      { status: 401 },
    );
  }
  const slug = slugify(new URL(req.url).searchParams.get("slug") ?? "");
  if (!slug) {
    return NextResponse.json(
      { detail: "Provide ?slug=<slug> to delete." },
      { status: 400 },
    );
  }
  try {
    await deleteFaqs([slug]);
    await deleteDocument(RAG_DOC_TYPE, slug);
    revalidatePath("/");
    revalidatePath("/faq");
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    console.error("[faq] delete failed", err);
    return NextResponse.json({ detail: "Delete failed." }, { status: 500 });
  }
}
