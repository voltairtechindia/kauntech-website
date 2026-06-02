/**
 * Public chat endpoint consumed by the site's ChatWidget.
 *
 * POST /api/chat  { message, session_id, page_url? }
 *   -> { reply, conversation_id, sources }
 *
 * Analytics for the turn run in an `after()` callback so they never add
 * latency to the reply (and never break it — they're best-effort).
 */
import { after, NextResponse } from "next/server";

import {
  LIMITS,
  SUPPORT_EMAIL,
  getClientIp,
  istDay,
  retryAfterSeconds,
  rlHit,
} from "@/lib/rate-limit";
import { processTurn } from "@/lib/rag/analytics";
import { handleChat } from "@/lib/rag/chat";
import type { ChatRequestBody } from "@/lib/rag/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);

  // Layer 1 — anti-flood burst limit (per IP, counts every request).
  const burst = await rlHit(
    `chat:burst:${ip}`,
    LIMITS.chatBurst.limit,
    LIMITS.chatBurst.windowSeconds,
  );
  if (!burst.allowed) {
    return NextResponse.json(
      {
        detail:
          "You're sending messages too quickly. Please wait a few seconds and try again.",
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(burst.resetAt)) },
      },
    );
  }

  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const sessionId =
    typeof body.session_id === "string" ? body.session_id.trim() : "";
  const pageUrl = typeof body.page_url === "string" ? body.page_url : null;

  if (!message || message.length > 4000) {
    return NextResponse.json(
      { detail: "message is required (1–4000 characters)." },
      { status: 400 },
    );
  }
  if (sessionId.length < 6 || sessionId.length > 128) {
    return NextResponse.json(
      { detail: "session_id is required (6–128 characters)." },
      { status: 400 },
    );
  }

  // Layer 2 — per-visitor daily question quota (only valid questions count).
  const daily = await rlHit(
    `chat:day:${istDay()}:${ip}`,
    LIMITS.chatDaily.limit,
    LIMITS.chatDaily.windowSeconds,
  );
  if (!daily.allowed) {
    return NextResponse.json(
      {
        detail: `You've reached today's question limit for the assistant. For more help, email ${SUPPORT_EMAIL} or try again tomorrow.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds(daily.resetAt)) },
      },
    );
  }

  // Layer 3 — global daily ceiling on Gemini calls (bill circuit-breaker).
  const global = await rlHit(
    `chat:global:${istDay()}`,
    LIMITS.chatGlobal.limit,
    LIMITS.chatGlobal.windowSeconds,
  );
  if (!global.allowed) {
    return NextResponse.json(
      {
        detail: `Our assistant is experiencing very high demand right now. Please try again later, or email ${SUPPORT_EMAIL}.`,
      },
      { status: 503, headers: { "Retry-After": "3600" } },
    );
  }

  try {
    const { response, analytics } = await handleChat({
      message,
      sessionId,
      pageUrl,
    });

    if (analytics) {
      after(() =>
        processTurn({
          conversationId: analytics.conversationId,
          userMessage: message,
          assistantReply: response.reply,
          pageUrl,
        }),
      );
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error("[rag] chat handler failed", err);
    return NextResponse.json(
      { detail: "The assistant hit a snag. Please try again in a moment." },
      { status: 500 },
    );
  }
}
