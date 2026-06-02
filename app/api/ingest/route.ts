/**
 * Admin-gated knowledge-base ingestion. Lets you (or an automation like n8n)
 * push documents into the RAG store WITHOUT redeploying.
 *
 * Auth: send header  X-Admin-Key: <ADMIN_API_KEY>
 *
 * POST /api/ingest  { "seed": true }          -> (re)load the built-in Kauntech KB
 * POST /api/ingest  { "documents": [ ... ] }  -> upsert arbitrary documents
 *      each document: { doc_type, content, external_id?, title?, metadata? }
 * POST /api/ingest  { "flushCache": true }    -> clear the chatbot response cache
 *      (use after a prompt/model change — those don't go through ingest())
 * GET  /api/ingest                            -> document counts by doc_type
 *
 * Blog pipeline: n8n inserts a row into `blog_posts`, then POSTs the post here
 * as { documents: [{ doc_type: "blog", external_id: <slug>, title, content, metadata }] }
 * so the chatbot instantly knows about the new post.
 */
import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/admin-auth";
import { clearChatCache } from "@/lib/rag/cache";
import { KNOWLEDGE_BASE } from "@/lib/rag/data/knowledge-base";
import { countDocuments } from "@/lib/rag/db";
import { ingest } from "@/lib/rag/ingest";
import type { IngestDocument } from "@/lib/rag/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidDoc(d: unknown): d is IngestDocument {
  if (typeof d !== "object" || d === null) return false;
  const doc = d as Record<string, unknown>;
  return typeof doc.doc_type === "string" && typeof doc.content === "string";
}

export async function POST(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { detail: "Invalid or missing X-Admin-Key." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  // Flush the chat cache without re-ingesting (e.g. after a prompt/model change).
  if (body.flushCache === true) {
    await clearChatCache();
    return NextResponse.json({ ok: true, flushed: "chat_cache" });
  }

  let documents: IngestDocument[];
  if (body.seed === true) {
    documents = KNOWLEDGE_BASE;
  } else if (Array.isArray(body.documents)) {
    documents = body.documents.filter(isValidDoc);
  } else {
    return NextResponse.json(
      {
        detail:
          'Provide { "seed": true } to load the built-in KB, or { "documents": [...] }.',
      },
      { status: 400 },
    );
  }

  if (!documents.length) {
    return NextResponse.json(
      { detail: "No valid documents to ingest (need doc_type + content)." },
      { status: 400 },
    );
  }

  try {
    const counts = await ingest(documents);
    const ingested = Object.values(counts).reduce((a, b) => a + b, 0);
    return NextResponse.json({ ingested, doc_types: counts });
  } catch (err) {
    console.error("[rag] ingest failed", err);
    return NextResponse.json({ detail: "Ingestion failed." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  if (!isAdmin(req)) {
    return NextResponse.json(
      { detail: "Invalid or missing X-Admin-Key." },
      { status: 401 },
    );
  }
  try {
    return NextResponse.json(await countDocuments());
  } catch (err) {
    console.error("[rag] document count failed", err);
    return NextResponse.json({ detail: "Count failed." }, { status: 500 });
  }
}
