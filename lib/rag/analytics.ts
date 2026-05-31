/**
 * Customer analytics: extract structured insight from each chat turn, merge it
 * into the conversation snapshot, and append an insight event.
 *
 * Runs in a Next.js `after()` callback so it never adds latency to the reply.
 * Every failure is logged and swallowed — analytics must never break chat.
 *
 * Kauntech is a software app (no physical stores), so we reuse the generic
 * `conversations` columns: feature mentions map onto `mentioned_products`, and
 * the location/asked_for_location columns are left at their defaults.
 */
import {
  addInsight,
  getConversation,
  updateConversation,
} from "./db";
import { generateJson } from "./gemini";
import {
  ANALYTICS_SYSTEM_PROMPT,
  buildAnalyticsPrompt,
} from "./prompts";

const INTENTS = new Set([
  "pricing",
  "feature_inquiry",
  "compliance",
  "support",
  "get_started",
  "general",
]);
const SENTIMENTS = new Set(["positive", "neutral", "negative"]);

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function clean(v: unknown, allowed: Set<string>): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase().replace(/ /g, "_");
  if (!s || ["null", "none", "unknown"].includes(s)) return null;
  return allowed.has(s) ? s : null;
}

function merge(existing: unknown, next: string[]): string[] {
  const base = Array.isArray(existing) ? (existing as string[]) : [];
  return Array.from(new Set([...base, ...next]));
}

/** 0–100 heuristic lead score. Re-tune to the funnel that matters to you. */
function leadScore(
  topics: string[],
  features: string[],
  intent: string | null,
): number {
  let score = 0;
  score += Math.min(topics.length, 4) * 8;
  score += features.length ? 15 : 0;
  if (intent === "pricing" || intent === "get_started") score += 30;
  else if (intent === "feature_inquiry" || intent === "compliance") score += 12;
  return Math.max(0, Math.min(score, 100));
}

export async function processTurn(args: {
  conversationId: string;
  userMessage: string;
  assistantReply: string;
  pageUrl?: string | null;
}): Promise<void> {
  try {
    const raw = await generateJson(
      ANALYTICS_SYSTEM_PROMPT,
      buildAnalyticsPrompt(args.userMessage, args.assistantReply),
    );

    const topics = asList(raw.topics).map((t) => t.toLowerCase());
    const features = asList(raw.mentioned_features);
    const intent = clean(raw.intent, INTENTS);
    const sentiment = clean(raw.sentiment, SENTIMENTS);

    const current = (await getConversation(args.conversationId)) ?? {};
    const mergedTopics = merge(current.topics, topics);
    const mergedFeatures = merge(current.mentioned_products, features);

    const snapshot: Record<string, unknown> = {
      topics: mergedTopics,
      mentioned_products: mergedFeatures,
      lead_score: leadScore(mergedTopics, mergedFeatures, intent),
    };
    if (intent) snapshot.intent = intent;
    if (sentiment) snapshot.sentiment = sentiment;
    if (args.pageUrl) {
      const meta = {
        ...((current.metadata as Record<string, unknown>) ?? {}),
        last_page_url: args.pageUrl,
      };
      snapshot.metadata = meta;
    }

    await updateConversation(args.conversationId, snapshot);
    await addInsight({
      conversation_id: args.conversationId,
      topics,
      mentioned_products: features,
      intent,
      sentiment,
      raw: { topics, mentioned_features: features, intent, sentiment },
    });
  } catch (err) {
    console.error(
      `[rag] analytics extraction failed for conversation ${args.conversationId}`,
      err,
    );
  }
}
