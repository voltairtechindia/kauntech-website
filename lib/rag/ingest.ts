/** Document ingestion: embed content and upsert into the pgvector store. */
import { clearChatCache, clearChatCacheForType } from "./cache";
import { upsertDocuments } from "./db";
import { embed } from "./gemini";
import type { IngestDocument } from "./types";

export async function ingest(
  documents: IngestDocument[],
): Promise<Record<string, number>> {
  if (!documents.length) return {};

  // Embed in document mode (asymmetric with query embeddings).
  const vectors = await embed(
    documents.map((d) => d.content),
    "document",
  );

  const counts: Record<string, number> = {};
  const rows = documents.map((doc, i) => {
    counts[doc.doc_type] = (counts[doc.doc_type] ?? 0) + 1;
    return {
      doc_type: doc.doc_type,
      external_id: doc.external_id ?? null,
      title: doc.title ?? null,
      content: doc.content,
      metadata: doc.metadata ?? {},
      embedding: vectors[i],
    };
  });

  await upsertDocuments(rows);

  // Store changed → drop cached answers that could now be stale. A blog-only
  // ingest (the daily case) evicts just the blog-citing entries; anything
  // touching the KB invalidates everything.
  const types = Object.keys(counts);
  if (types.length === 1 && types[0] === "blog") {
    await clearChatCacheForType("blog");
  } else {
    await clearChatCache();
  }

  return counts;
}
