/**
 * Chat orchestration: retrieve grounded knowledge → build history → generate
 * → persist transcript. Returns the reply plus a handle the route uses to run
 * analytics in the background.
 *
 * Retrieval + generation are the core and must succeed. Conversation logging
 * is best-effort: if Supabase is unreachable we still answer (statelessly) so
 * a logging blip never takes the bot down.
 */
import { config } from "./config";
import {
  addMessages,
  getOrCreateConversation,
  getRecentMessages,
} from "./db";
import { generate, type ChatTurn } from "./gemini";
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
  // 1. Retrieve grounded knowledge (core path).
  const docs = await search(args.message);
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

  // 3. Generate the grounded reply.
  const reply = await generate(SYSTEM_PROMPT, history);

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

  return {
    response: { reply, conversation_id: conversationId, sources },
    analytics: conversationId ? { conversationId } : null,
  };
}
