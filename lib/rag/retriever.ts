/**
 * RAG retriever: embed the query, pull nearest neighbours from pgvector, and
 * render them into a compact, labelled context block for the prompt.
 */
import { config } from "./config";
import { matchDocuments } from "./db";
import { embedQuery } from "./gemini";
import type { RetrievedDoc } from "./types";

export async function search(
  query: string,
  opts: {
    topK?: number;
    filterType?: string | null;
    minSimilarity?: number;
  } = {},
): Promise<RetrievedDoc[]> {
  const vector = await embedQuery(query);
  return matchDocuments(
    vector,
    opts.topK ?? config.ragTopK,
    opts.filterType ?? null,
    opts.minSimilarity ?? config.ragMinSimilarity,
  );
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
