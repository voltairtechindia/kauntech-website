/**
 * Server-side RAG configuration, read from environment variables.
 *
 * Nothing here is exposed to the browser — the chat widget talks only to our
 * own `/api/chat` route, which runs server-side and reads these values. Swap
 * the model with LLM_MODEL / EMBEDDING_MODEL; deployment is just setting env.
 *
 * See `.env.local.example` for the full list.
 */

function num(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  // --- Supabase (server-only; the service-role key bypasses RLS) ---
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? "",

  // --- Gemini (LLM + embeddings) ---
  googleApiKey: process.env.GOOGLE_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "gemini-2.5-flash",
  llmTemperature: num(process.env.LLM_TEMPERATURE, 0.6),
  llmMaxOutputTokens: num(process.env.LLM_MAX_OUTPUT_TOKENS, 1024),
  embeddingModel: process.env.EMBEDDING_MODEL ?? "gemini-embedding-001",
  // Must match the vector(N) size in supabase/migrations/0001_init.sql.
  embeddingDim: num(process.env.EMBEDDING_DIM, 768),

  // --- RAG tuning ---
  ragTopK: num(process.env.RAG_TOP_K, 6),
  ragMinSimilarity: num(process.env.RAG_MIN_SIMILARITY, 0.3),
  historyWindow: num(process.env.HISTORY_WINDOW, 12),

  // --- Security (protects POST/GET /api/ingest) ---
  adminApiKey: process.env.ADMIN_API_KEY ?? "",

  // --- Brand (shapes the assistant persona — see prompts.ts) ---
  brandName: "Kauntech",
  appName: "Kauntech AI Specialist",
  supportEmail: "business@voltairtech.com",
} as const;
