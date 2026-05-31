/**
 * Admin-gated blog endpoint — the n8n target. Writes a post to `blog_posts`
 * AND (when published) ingests it into the RAG store in one call, so the
 * chatbot instantly knows about the new article. Service-role + Gemini keys
 * stay server-side; n8n only needs ADMIN_API_KEY.
 *
 * Auth: header  X-Admin-Key: <ADMIN_API_KEY>
 *
 * POST /api/blog
 *   Body: a single post object, or { "posts": [ ... ] } for a batch.
 *   Each post: {
 *     slug, title,                       // required
 *     excerpt?, body_md?, author?,
 *     cover_image?: { url, alt },
 *     media?: [ { type:"image"|"video"|"embed", url, alt?, caption?, poster?, provider? } ],
 *     tags?: string[],
 *     seo?: { title, description, og_image },
 *     status?: "draft"|"published"|"archived",   // default "published"
 *     reading_minutes?, published_at?            // auto-filled if omitted
 *   }
 *   -> 200 { ok, count, posts: [{ slug, status, url }] }
 *
 * GET  /api/blog            -> { total, published, draft, archived }
 * DELETE /api/blog?slug=... -> removes the post + its RAG document
 *
 * Media: upload photos/short videos to the public `blog-media` Supabase Storage
 * bucket first (n8n Supabase node), then pass the resulting public URLs here.
 * Long videos: pass a YouTube/Vimeo URL as { type:"embed" }. See BLOG_PIPELINE.md.
 */
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { upsertPost } from "@/lib/blog/db";
import type { BlogPost, BlogUpsert, MediaItem } from "@/lib/blog/types";
import {
  estimateReadingMinutes,
  markdownToPlainText,
  slugify,
} from "@/lib/blog/util";
import { deleteDocument } from "@/lib/rag/db";
import { ingest } from "@/lib/rag/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SITE_URL = "https://www.kauntech.com";
const VALID_STATUS = new Set(["draft", "published", "archived"]);
const VALID_MEDIA = new Set(["image", "video", "embed"]);

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Validate + normalise an incoming post. Returns the row or an error string. */
function normalize(
  input: unknown,
): { row: BlogUpsert & { reading_minutes: number | null } } | { error: string } {
  if (typeof input !== "object" || input === null) {
    return { error: "Each post must be an object." };
  }
  const p = input as Record<string, unknown>;

  const title = str(p.title);
  if (!title) return { error: "title is required." };

  const slug = slugify(str(p.slug) || title);
  if (!slug) return { error: `Could not derive a slug for "${title}".` };

  const status = str(p.status) || "published";
  if (!VALID_STATUS.has(status)) {
    return { error: `Invalid status "${status}".` };
  }

  const body_md = typeof p.body_md === "string" ? p.body_md : "";

  // Keep only well-formed media items.
  const media: MediaItem[] = Array.isArray(p.media)
    ? (p.media.filter((m) => {
        if (typeof m !== "object" || m === null) return false;
        const item = m as Record<string, unknown>;
        return VALID_MEDIA.has(str(item.type)) && !!str(item.url);
      }) as MediaItem[])
    : [];

  const tags = Array.isArray(p.tags)
    ? p.tags.filter((t): t is string => typeof t === "string")
    : [];

  const cover =
    typeof p.cover_image === "object" && p.cover_image !== null
      ? (p.cover_image as BlogUpsert["cover_image"])
      : null;

  const seo =
    typeof p.seo === "object" && p.seo !== null
      ? (p.seo as BlogUpsert["seo"])
      : {};

  const reading_minutes =
    typeof p.reading_minutes === "number" && p.reading_minutes > 0
      ? Math.round(p.reading_minutes)
      : estimateReadingMinutes(body_md);

  // Published posts need a timestamp; default to now if caller omitted it.
  const publishedAt = str(p.published_at);
  const published_at =
    status === "published" ? publishedAt || new Date().toISOString() : publishedAt || null;

  return {
    row: {
      slug,
      title,
      excerpt: str(p.excerpt) || null,
      body_md,
      cover_image: cover ?? null,
      media,
      tags,
      author: str(p.author) || "Kauntech",
      seo: seo ?? {},
      status: status as BlogUpsert["status"],
      reading_minutes,
      published_at,
    },
  };
}

/** Mirror a stored post into the RAG store (or remove it if not published). */
async function syncRag(post: BlogPost): Promise<void> {
  if (post.status !== "published") {
    await deleteDocument("blog", post.slug);
    return;
  }
  const url = `${SITE_URL}/blog/${post.slug}`;
  const parts = [
    post.title,
    post.excerpt ?? "",
    markdownToPlainText(post.body_md),
  ].filter(Boolean);
  await ingest([
    {
      doc_type: "blog",
      external_id: post.slug,
      title: post.title,
      content: parts.join("\n\n"),
      metadata: {
        slug: post.slug,
        url,
        tags: post.tags,
        author: post.author,
        published_at: post.published_at,
        cover_image: post.cover_image?.url ?? null,
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
    body && typeof body === "object" && Array.isArray((body as Record<string, unknown>).posts)
      ? ((body as Record<string, unknown>).posts as unknown[])
      : [body];

  if (!raw.length) {
    return NextResponse.json({ detail: "No posts provided." }, { status: 400 });
  }

  const results: { slug: string; status: string; url: string }[] = [];
  try {
    for (const item of raw) {
      const parsed = normalize(item);
      if ("error" in parsed) {
        return NextResponse.json({ detail: parsed.error }, { status: 400 });
      }
      const stored = await upsertPost(parsed.row);
      await syncRag(stored);
      results.push({
        slug: stored.slug,
        status: stored.status,
        url: `${SITE_URL}/blog/${stored.slug}`,
      });
    }
  } catch (err) {
    console.error("[blog] upsert failed", err);
    return NextResponse.json(
      { detail: "Could not save the post." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, count: results.length, posts: results });
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
    const { data, error } = await sb.from("blog_posts").select("status");
    if (error) throw error;
    const rows = (data ?? []) as { status: string }[];
    const counts = {
      total: rows.length,
      published: rows.filter((r) => r.status === "published").length,
      draft: rows.filter((r) => r.status === "draft").length,
      archived: rows.filter((r) => r.status === "archived").length,
    };
    return NextResponse.json(counts);
  } catch (err) {
    console.error("[blog] count failed", err);
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
    const { getSupabase } = await import("@/lib/rag/supabase");
    const sb = getSupabase();
    const { error } = await sb.from("blog_posts").delete().eq("slug", slug);
    if (error) throw error;
    await deleteDocument("blog", slug);
    return NextResponse.json({ ok: true, slug });
  } catch (err) {
    console.error("[blog] delete failed", err);
    return NextResponse.json({ detail: "Delete failed." }, { status: 500 });
  }
}
