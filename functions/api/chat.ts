/**
 * POST /api/chat  { message, session_id, page_url? }  ->  { reply, conversation_id, sources }
 *
 * The AI assistant behind the site's chat widget: embeds the question with
 * Gemini, finds the closest knowledge-base documents in Supabase (pgvector) and
 * writes a grounded reply. Every turn is logged to the `conversations` and
 * `messages` tables, which the admin panel reads; the turn's analytics run
 * after the response via waitUntil so they add no latency.
 *
 * Three rate limits protect the Gemini bill: a per-IP burst limit, a per-IP
 * daily quota and a global daily ceiling (lib/rate-limit.ts).
 */
import { json, prepare, type PagesContext } from "../_lib/runtime";

export async function onRequestPost(ctx: PagesContext): Promise<Response> {
  prepare(ctx);
  const { LIMITS, SUPPORT_EMAIL, getClientIp, istDay, retryAfterSeconds, rlHit } = await import(
    "../../lib/rate-limit"
  );
  const { handleChat } = await import("../../lib/rag/chat");
  const { processTurn } = await import("../../lib/rag/analytics");
  const req = ctx.request;
  const ip = getClientIp(req);

  const burst = await rlHit(`chat:burst:${ip}`, LIMITS.chatBurst.limit, LIMITS.chatBurst.windowSeconds);
  if (!burst.allowed) {
    return json(
      { detail: "You're sending messages too quickly. Please wait a few seconds and try again." },
      429,
      { "Retry-After": String(retryAfterSeconds(burst.resetAt)) },
    );
  }

  let body: { message?: unknown; session_id?: unknown; page_url?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ detail: "Invalid JSON body." }, 400);
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id.trim() : "";
  const pageUrl = typeof body.page_url === "string" ? body.page_url.slice(0, 500) : null;
  if (!message || message.length > 4000) {
    return json({ detail: "message is required (1 to 4000 characters)." }, 400);
  }
  if (sessionId.length < 6 || sessionId.length > 128) {
    return json({ detail: "session_id is required (6 to 128 characters)." }, 400);
  }

  const daily = await rlHit(`chat:day:${istDay()}:${ip}`, LIMITS.chatDaily.limit, LIMITS.chatDaily.windowSeconds);
  if (!daily.allowed) {
    return json(
      {
        detail: `You've reached today's question limit for the assistant. For more help, email ${SUPPORT_EMAIL} or try again tomorrow.`,
      },
      429,
      { "Retry-After": String(retryAfterSeconds(daily.resetAt)) },
    );
  }
  const global = await rlHit(`chat:global:${istDay()}`, LIMITS.chatGlobal.limit, LIMITS.chatGlobal.windowSeconds);
  if (!global.allowed) {
    return json(
      { detail: `Our assistant is very busy right now. Please try again later, or email ${SUPPORT_EMAIL}.` },
      503,
      { "Retry-After": "3600" },
    );
  }

  try {
    const { response, analytics } = await handleChat({ message, sessionId, pageUrl });
    if (analytics) {
      ctx.waitUntil(
        processTurn({
          conversationId: analytics.conversationId,
          userMessage: message,
          assistantReply: response.reply,
          pageUrl,
        }).catch((err: unknown) => console.error("[rag] analytics failed", err)),
      );
    }
    return json(response);
  } catch (err) {
    console.error("[rag] chat handler failed", err);
    return json({ detail: "The assistant hit a snag. Please try again in a moment." }, 500);
  }
}
