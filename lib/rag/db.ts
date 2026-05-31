/**
 * Supabase data-access layer for the RAG engine: pgvector retrieval, document
 * upserts, and conversation/message/insight logging. All calls go through the
 * server-side service-role client.
 */
import { getSupabase } from "./supabase";
import type { RetrievedDoc } from "./types";

export interface MessageRow {
  role: string;
  content: string;
}

// --- RAG ------------------------------------------------------------------
export async function matchDocuments(
  queryEmbedding: number[],
  matchCount: number,
  filterType: string | null,
  minSimilarity: number,
): Promise<RetrievedDoc[]> {
  const sb = getSupabase();
  const { data, error } = await sb.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_type: filterType,
    min_similarity: minSimilarity,
  });
  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    doc_type: String(r.doc_type),
    title: (r.title as string) ?? null,
    external_id: (r.external_id as string) ?? null,
    content: String(r.content),
    similarity: Number(r.similarity),
    metadata: (r.metadata as Record<string, unknown>) ?? {},
  }));
}

export async function upsertDocuments(
  rows: Record<string, unknown>[],
): Promise<number> {
  const sb = getSupabase();
  let total = 0;
  // Chunk to keep payloads reasonable.
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await sb
      .from("documents")
      .upsert(batch, { onConflict: "doc_type,external_id" });
    if (error) throw error;
    total += batch.length;
  }
  return total;
}

/** Remove a document by (doc_type, external_id). Used to pull an unpublished
 *  blog post back out of the RAG store so the chatbot stops citing it. */
export async function deleteDocument(
  docType: string,
  externalId: string,
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("documents")
    .delete()
    .eq("doc_type", docType)
    .eq("external_id", externalId);
  if (error) throw error;
}

export async function countDocuments(): Promise<Record<string, number>> {
  const sb = getSupabase();
  const { data, error } = await sb.from("documents").select("doc_type");
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { doc_type: string }[]) {
    counts[r.doc_type] = (counts[r.doc_type] ?? 0) + 1;
  }
  return counts;
}

// --- Conversations / messages --------------------------------------------
export async function getOrCreateConversation(
  sessionId: string,
): Promise<string> {
  const sb = getSupabase();
  const { data: existing } = await sb
    .from("conversations")
    .select("id")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (existing && existing.length) return existing[0].id as string;

  const { data, error } = await sb
    .from("conversations")
    .insert({ session_id: sessionId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function getRecentMessages(
  conversationId: string,
  limit: number,
): Promise<MessageRow[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  // Stored newest-first; return chronological.
  return ((data ?? []) as { role: string; content: string }[])
    .reverse()
    .map((r) => ({ role: r.role, content: r.content }));
}

export async function addMessages(
  conversationId: string,
  msgs: { role: string; content: string; metadata?: Record<string, unknown> }[],
): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("messages").insert(
    msgs.map((m) => ({
      conversation_id: conversationId,
      role: m.role,
      content: m.content,
      metadata: m.metadata ?? {},
    })),
  );
  if (error) throw error;
}

// --- Analytics ------------------------------------------------------------
export async function getConversation(
  conversationId: string,
): Promise<Record<string, unknown> | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .limit(1);
  return data && data.length ? (data[0] as Record<string, unknown>) : null;
}

export async function updateConversation(
  conversationId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  if (!Object.keys(fields).length) return;
  const sb = getSupabase();
  const { error } = await sb
    .from("conversations")
    .update(fields)
    .eq("id", conversationId);
  if (error) throw error;
}

export async function addInsight(row: Record<string, unknown>): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("conversation_insights").insert(row);
  if (error) throw error;
}
