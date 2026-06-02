/** Document ingestion: embed content and upsert into the pgvector store. */
import { clearChatCache } from "./cache";
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

  // KB changed → drop cached chat answers so they can't go stale.
  await clearChatCache();

  return counts;
}
