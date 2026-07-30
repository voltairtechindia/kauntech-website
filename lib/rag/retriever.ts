/**
 * RAG retriever: embed the query, pull nearest neighbours from pgvector, and
 * render them into a compact, labelled context block for the prompt.
 */
import { config } from "./config";
import { matchDocuments } from "./db";
import { embedQuery } from "./gemini";
import type { RetrievedDoc } from "./types";

/**
 * Retrieve context for a question.
 *
 * Blog documents are capped at `config.ragBlogMax` of the top-K slots. The
 * blog grows every day while the marketing KB is a fixed handful of documents,
 * so a plain nearest-neighbour search would, before long, answer "what does
 * Pro cost" out of articles that merely mention pricing. Two bounded queries
 * (best blog / best non-blog) share one embedding, and the merge keeps the
 * rest of the slots for the KB — a guarantee that holds at 20 posts or 2,000.
 *
 * Passing an explicit `filterType` skips the cap: the caller asked for one
 * doc_type and gets exactly that.
 */
export async function search(
  query: string,
  opts: {
    topK?: number;
    filterType?: string | null;
    minSimilarity?: number;
  } = {},
): Promise<RetrievedDoc[]> {
  const topK = opts.topK ?? config.ragTopK;
  const minSimilarity = opts.minSimilarity ?? config.ragMinSimilarity;
  const filterType = opts.filterType ?? null;
  const vector = await embedQuery(query);

  if (filterType !== null) {
    return matchDocuments(vector, topK, filterType, minSimilarity);
  }

  const blogMax = Math.max(0, Math.min(config.ragBlogMax, topK));

  // Ask for topK of each: whichever side is thin, the other can fill the gap.
  let kb: RetrievedDoc[];
  let blog: RetrievedDoc[];
  try {
    [kb, blog] = await Promise.all([
      matchDocuments(vector, topK, null, minSimilarity, ["blog"]),
      blogMax > 0
        ? matchDocuments(vector, topK, "blog", minSimilarity)
        : Promise.resolve([] as RetrievedDoc[]),
    ]);
  } catch (err) {
    // The excluding query needs migration 0018. Rather than fail the whole
    // answer on an un-migrated database, degrade to the old uncapped search
    // and make the cause loud in the logs.
    console.error(
      "[rag] capped retrieval failed - is migration 0018 applied? " +
        "Falling back to uncapped search.",
      err,
    );
    return matchDocuments(vector, topK, null, minSimilarity);
  }

  // KB first, then the blog up to its cap; top up with leftover blog matches
  // only if the KB couldn't fill the slots. Re-sort so the prompt still reads
  // strongest-match-first.
  const picked = [...kb, ...blog.slice(0, blogMax)]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
  if (picked.length < topK) {
    const seen = new Set(picked.map((d) => `${d.doc_type}:${d.external_id}`));
    for (const doc of blog.slice(blogMax)) {
      if (picked.length >= topK) break;
      if (!seen.has(`${doc.doc_type}:${doc.external_id}`)) picked.push(doc);
    }
    picked.sort((a, b) => b.similarity - a.similarity);
  }
  return picked;
}

export function buildContext(docs: RetrievedDoc[]): string {
  if (!docs.length) {
    return "(No matching knowledge-base entries were found.)";
  }
  return docs
    .map((d, i) => {
      const label = d.doc_type.replace(/_/g, " ").toUpperCase();
      const header = d.title
        ? `[${i + 1}] ${label} — ${d.title}`
        : `[${i + 1}] ${label}`;
      return `${header}\n${d.content.trim()}`;
    })
    .join("\n\n");
}
