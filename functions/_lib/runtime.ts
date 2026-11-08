/**
 * Shared glue for the Cloudflare Pages Functions in functions/api.
 *
 * The site itself is static (out/). These Functions run beside it on the same
 * domain, so the browser calls /api/chat and /api/inquiry with no CORS.
 * Secrets (SUPABASE_URL, SUPABASE_SERVICE_KEY, GOOGLE_API_KEY, ...) are set on
 * the Pages project with `wrangler pages secret put`, never in the repo.
 */

/** The parts of the Pages Functions context these handlers use. */
export type PagesContext = {
  request: Request;
  env: Record<string, unknown>;
  waitUntil: (p: Promise<unknown>) => void;
};

/**
 * lib/rag reads its settings from process.env when first imported, so copy the
 * Pages bindings there before importing it, and let lib/after.ts hand
 * background work (chat analytics) to this request's waitUntil.
 */
export function prepare(ctx: PagesContext): void {
  const g = globalThis as unknown as {
    process?: { env: Record<string, string | undefined> };
    __vtWaitUntil?: (p: Promise<unknown>) => void;
  };
  if (!g.process) g.process = { env: {} };
  if (!g.process.env) g.process.env = {};
  for (const [k, v] of Object.entries(ctx.env)) {
    if (typeof v === "string") g.process.env[k] = v;
  }
  g.__vtWaitUntil = (p) => ctx.waitUntil(p);
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}
