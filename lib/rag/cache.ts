/**
 * Chatbot response cache (skips Gemini embed + generate on repeat questions).
 *
 * Keyed on a sha256 of the normalized question, so only byte-identical repeats
 * (after normalization) hit it — the widget's preset chips are the big win.
 * Best-effort throughout: any cache error falls back to a normal live answer.
 */
import { createHash } from "node:crypto";

import { getSupabase } from "./supabase";
import type { SourceDoc } from "./types";

const TTL_SECONDS = 7 * 24 * 3600; // 7 days
const MAX_CACHEABLE_LEN = 500; // don't cache long/likely-unique prompts

export interface CachedReply {
  reply: string;
  sources: SourceDoc[];
}

/** Lowercase, trim, collapse whitespace, drop trailing punctuation. */
export function normalizeQuestion(message: string): string {
  return message
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?!.\s]+$/g, "");
}

export function questionHash(message: string): string {
  return createHash("sha256").update(normalizeQuestion(message)).digest("hex");
}

/** Whether a message is worth caching (short enough to be a repeatable FAQ). */
export function isCacheable(message: string): boolean {
  const n = normalizeQuestion(message);
  return n.length > 0 && n.length <= MAX_CACHEABLE_LEN;
}

/** Returns a fresh cached reply for this question, or null on miss/expired. */
export async function getCachedReply(hash: string): Promise<CachedReply | null> {
  try {
    const { data, error } = await getSupabase()
      .from("chat_cache")
      .select("reply, sources, expires_at")
      .eq("q_hash", hash)
      .maybeSingle();
    if (error || !data) return null;
    if (new Date(data.expires_at as string).getTime() <= Date.now()) return null;
    return {
      reply: data.reply as string,
      sources: (data.sources as SourceDoc[]) ?? [],
    };
  } catch (err) {
    console.error("[rag] cache read failed (ignoring)", err);
    return null;
  }
}

/** Store a freshly generated reply (best-effort). */
export async function putCachedReply(
  hash: string,
  question: string,
  reply: CachedReply,
): Promise<void> {
  try {
    await getSupabase()
      .from("chat_cache")
      .upsert({
        q_hash: hash,
        question: normalizeQuestion(question),
        reply: reply.reply,
        sources: reply.sources,
        expires_at: new Date(Date.now() + TTL_SECONDS * 1000).toISOString(),
      });
  } catch (err) {
    console.error("[rag] cache write failed (ignoring)", err);
  }
}

/** Increment the hit counter for analytics (best-effort). */
export async function bumpCacheHit(hash: string): Promise<void> {
  try {
    await getSupabase().rpc("chat_cache_bump", { p_hash: hash });
  } catch {
    /* non-critical */
  }
}

/** Wipe the cache — call whenever the knowledge base changes. */
export async function clearChatCache(): Promise<void> {
  try {
    await getSupabase()
      .from("chat_cache")
      .delete()
      .neq("q_hash", "");
  } catch (err) {
    console.error("[rag] cache clear failed (ignoring)", err);
  }
}
