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

import { processTurn } from "@/lib/rag/analytics";
import { handleChat } from "@/lib/rag/chat";
import type { ChatRequestBody } from "@/lib/rag/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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
