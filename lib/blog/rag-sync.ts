/**
 * Rolling blog window for the RAG store.
 *
 * The chatbot should stay grounded in the *current* blog, not the whole
 * archive: an unbounded store means unbounded embedding churn and a growing
 * tail of stale posts contradicting current pricing. So exactly the newest
 * `BLOG_RAG_WINDOW` published posts get a `documents` row — older ones are
 * pruned, and a post that re-enters the window (because a newer one was
 * deleted or unpublished) is re-embedded.
 *
 * This is the *storage* bound. The one that actually protects answer quality
 * is the per-retrieval cap in lib/rag/retriever.ts, which limits how many blog
 * documents can occupy the top-K slots no matter how big the archive gets.
 *
 * Pruning only touches the RAG store: the posts stay live on /blog, in the
 * sitemap and in /llms.txt. They just stop being chatbot context.
 *
 * Run after every blog write (publish / unpublish / delete) and on demand via
 * POST /api/ingest { "pruneBlog": true }.
 */
import { clearChatCacheForType } from "@/lib/rag/cache";
import { ingest } from "@/lib/rag/ingest";
import { getSupabase } from "@/lib/rag/supabase";
import type { IngestDocument } from "@/lib/rag/types";

import { listWindowPosts } from "./db";
import type { BlogPost } from "./types";
import { markdownToPlainText } from "./util";

const SITE_URL = "https://www.kauntech.com";

/**
 * How many recent published posts the chatbot is allowed to know about.
 *
 * At a post a day this is roughly two months of archive. It can be generous
 * because it is no longer the thing protecting the marketing KB from being
 * crowded out — `config.ragBlogMax` caps blog documents per retrieval, so a
 * bigger window widens what the chatbot *can* cite without letting the blog
 * take over what it *does* cite.
 */
export const BLOG_RAG_WINDOW = Number(process.env.BLOG_RAG_WINDOW) || 60;

export interface WindowSync {
  kept: string[]; // slugs the chatbot knows about, newest first
  added: string[]; // newly embedded this run
  removed: string[]; // dropped out of the window (or unpublished/deleted)
}

/** The embeddable form of a post: title + excerpt + body + FAQ answers. */
export function blogDocument(post: BlogPost): IngestDocument {
  const faqText = (post.faq ?? [])
    .map((f) => `Q: ${f.q}\nA: ${f.a}`)
    .join("\n\n");
  const parts = [
    post.title,
    post.excerpt ?? "",
    markdownToPlainText(post.body_md),
    faqText,
  ].filter(Boolean);
  return {
    doc_type: "blog",
    external_id: post.slug,
    title: post.title,
    content: parts.join("\n\n"),
    metadata: {
      slug: post.slug,
      url: `${SITE_URL}/blog/${post.slug}`,
      tags: post.tags,
      author: post.author,
      published_at: post.published_at,
      cover_image: post.cover_image?.url ?? null,
    },
  };
}

/** Every `doc_type: "blog"` external_id currently in the store. */
async function storedBlogSlugs(): Promise<Set<string | null>> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("documents")
    .select("external_id")
    .eq("doc_type", "blog");
  if (error) throw error;
  return new Set(
    ((data ?? []) as { external_id: string | null }[]).map((r) => r.external_id),
  );
}

/**
 * Reconcile the RAG store with the newest `limit` published posts.
 *
 * `force` re-embeds the given slugs even if they're already stored — used on
 * write so an edited post's document reflects the new text.
 */
export async function syncBlogWindow(
  opts: { limit?: number; force?: string[] } = {},
): Promise<WindowSync> {
  const limit = opts.limit ?? BLOG_RAG_WINDOW;
  const force = new Set(opts.force ?? []);

  const posts = await listWindowPosts(limit);
  const kept = posts.map((p) => p.slug);
  const keptSet = new Set<string>(kept);
  const stored = await storedBlogSlugs();

  // Out: anything stored that isn't in the window — older posts, unpublished
  // ones, deleted ones, plus orphans with no external_id (unmappable, so they
  // can never be in the window).
  const stale = [...stored].filter((s) => s === null || !keptSet.has(s));
  const removed = stale.filter((s): s is string => !!s);
  if (stale.length) {
    const sb = getSupabase();
    for (let i = 0; i < removed.length; i += 100) {
      const { error } = await sb
        .from("documents")
        .delete()
        .eq("doc_type", "blog")
        .in("external_id", removed.slice(i, i + 100));
      if (error) throw error;
    }
    if (stale.length > removed.length) {
      const { error } = await sb
        .from("documents")
        .delete()
        .eq("doc_type", "blog")
        .is("external_id", null);
      if (error) throw error;
    }
    // Cached answers may cite a post we just dropped — evict only those.
    await clearChatCacheForType("blog");
  }

  // In: posts in the window with no document yet, plus any forced re-embed.
  const toEmbed = posts.filter((p) => !stored.has(p.slug) || force.has(p.slug));
  if (toEmbed.length) await ingest(toEmbed.map(blogDocument));

  return { kept, added: toEmbed.map((p) => p.slug), removed };
}
