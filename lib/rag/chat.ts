/**
 * Chat orchestration: retrieve grounded knowledge → build history → generate
 * → persist transcript. Returns the reply plus a handle the route uses to run
 * analytics in the background.
 *
 * Retrieval + generation are the core and must succeed. Conversation logging
 * is best-effort: if Supabase is unreachable we still answer (statelessly) so
 * a logging blip never takes the bot down.
 */
import {
  bumpCacheHit,
  getCachedReply,
  isCacheable,
  putCachedReply,
  questionHash,
} from "./cache";
import { config } from "./config";
import {
  addMessages,
  getOrCreateConversation,
  getRecentMessages,
} from "./db";
import { FALLBACK_REPLY, generate, type ChatTurn } from "./gemini";
import { SYSTEM_PROMPT, buildChatTurn } from "./prompts";
import { buildContext, search } from "./retriever";
import type { ChatResponseBody, SourceDoc } from "./types";

export interface ChatResult {
  response: ChatResponseBody;
  // Present only when the turn was logged and is eligible for analytics.
  analytics: { conversationId: string } | null;
}

export async function handleChat(args: {
  message: string;
  sessionId: string;
  pageUrl?: string | null;
}): Promise<ChatResult> {
  // 0. Response cache — if this exact (normalized) question was answered
  // recently, return it WITHOUT calling Gemini (embed + generate). We still
  // log the transcript so multi-turn history stays intact for later turns.
  const cacheable = isCacheable(args.message);
  const hash = cacheable ? questionHash(args.message) : "";
  if (cacheable) {
    const cached = await getCachedReply(hash);
    if (cached) {
      let conversationId: string | null = null;
      try {
        conversationId = await getOrCreateConversation(args.sessionId);
        await addMessages(conversationId, [
          { role: "user", content: args.message },
          {
            role: "assistant",
            content: cached.reply,
            metadata: { cache: "hit" },
          },
        ]);
      } catch (err) {
        console.error("[rag] cache-hit persist failed (continuing)", err);
      }
      void bumpCacheHit(hash);
      return {
        response: {
          reply: cached.reply,
          conversation_id: conversationId,
          sources: cached.sources,
        },
        analytics: conversationId ? { conversationId } : null,
      };
    }
  }

  // 1. Retrieve grounded knowledge. Best-effort: if the embed/match step fails
  // (after its own retries), degrade to an ungrounded reply rather than 500-ing
  // the user. The system prompt handles an empty context gracefully ("say
  // you're not sure and suggest emailing the team").
  let docs: Awaited<ReturnType<typeof search>> = [];
  try {
    docs = await search(args.message);
  } catch (err) {
    console.error("[rag] retrieval failed (answering ungrounded)", err);
  }
  const context = buildContext(docs);

  // 2. Load conversation history (best-effort).
  let conversationId: string | null = null;
  let history: ChatTurn[] = [];
  try {
    conversationId = await getOrCreateConversation(args.sessionId);
    const recent = await getRecentMessages(conversationId, config.historyWindow);
    history = recent
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        text: m.content,
      }));
    // Gemini requires the conversation to start with a user turn.
    while (history.length && history[0].role === "model") history.shift();
  } catch (err) {
    console.error("[rag] conversation load failed (continuing stateless)", err);
    conversationId = null;
    history = [];
  }

  history.push({ role: "user", text: buildChatTurn(context, args.message) });

  // 3. Generate the grounded reply. Best-effort: if generation still fails
  // after its retries, return a graceful fallback rather than a hard 500.
  let reply: string;
  try {
    reply = await generate(SYSTEM_PROMPT, history);
  } catch (err) {
    console.error("[rag] generation failed (returning fallback)", err);
    reply = FALLBACK_REPLY;
  }

  // 4. Persist the transcript (best-effort).
  if (conversationId) {
    try {
      await addMessages(conversationId, [
        { role: "user", content: args.message },
        {
          role: "assistant",
          content: reply,
          metadata: {
            source_ids: docs
              .map((d) => d.external_id)
              .filter((id): id is string => Boolean(id)),
          },
        },
      ]);
    } catch (err) {
      console.error("[rag] message persist failed", err);
    }
  }

  const sources: SourceDoc[] = docs.map((d) => ({
    doc_type: d.doc_type,
    title: d.title,
    external_id: d.external_id,
    similarity: Math.round(d.similarity * 1000) / 1000,
  }));

  // Cache the fresh answer for next time (best-effort, non-blocking).
  //
  // Never cache a fallback. During the Netlify AI Gateway outage every reply was
  // the apology, and each one was written to chat_cache — so the popular questions
  // kept answering with it even after generation was working again, with no error
  // anywhere to explain why. `generate` also returns the fallback WITHOUT throwing
  // when the model comes back empty, so compare the reply rather than catching.
  if (cacheable && reply !== FALLBACK_REPLY) {
    void putCachedReply(hash, args.message, { reply, sources });
  }

  return {
    response: { reply, conversation_id: conversationId, sources },
    analytics: conversationId ? { conversationId } : null,
  };
}
