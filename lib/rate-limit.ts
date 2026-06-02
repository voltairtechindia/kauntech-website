/**
 * IP / quota rate limiting for the public POST endpoints.
 *
 * Backed by the `rl_hit()` Postgres function (migration 0011) via the
 * service-role Supabase client — durable and shared across all serverless
 * instances, so counts actually hold on Vercel's Fluid Compute (unlike an
 * in-memory map, which resets per instance).
 *
 * Fails OPEN (allows the request) if the store is unreachable: the chat path
 * already depends on Supabase for retrieval, so the limiter shares fate with
 * the core dependency and adds no new outage mode.
 */
import { getSupabase } from "@/lib/rag/supabase";

export const SUPPORT_EMAIL = "business@voltairtech.com";

/**
 * Best-effort client IP. On Vercel, `x-forwarded-for`'s first hop is the real
 * client (the platform rewrites it at the edge). Falls back to `x-real-ip`.
 */
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Current calendar day in IST (Asia/Kolkata) as YYYY-MM-DD — used so daily
 *  quotas reset at local midnight ("try again tomorrow"). */
export function istDay(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export interface RlResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date | null;
}

/** Atomic fixed-window check. Returns allowed=true on any store error. */
export async function rlHit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RlResult> {
  try {
    const { data, error } = await getSupabase().rpc("rl_hit", {
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    const row = Array.isArray(data) ? data[0] : null;
    if (error || !row) {
      if (error) console.error("[ratelimit] rl_hit failed (allowing)", error);
      return { allowed: true, remaining: limit, resetAt: null };
    }
    return {
      allowed: Boolean(row.allowed),
      remaining: Number(row.remaining ?? 0),
      resetAt: row.reset_at ? new Date(row.reset_at) : null,
    };
  } catch (err) {
    console.error("[ratelimit] rl_hit threw (allowing)", err);
    return { allowed: true, remaining: limit, resetAt: null };
  }
}

/** Seconds until the window resets, for a Retry-After header. */
export function retryAfterSeconds(resetAt: Date | null, fallback = 60): number {
  if (!resetAt) return fallback;
  return Math.max(1, Math.ceil((resetAt.getTime() - Date.now()) / 1000));
}

const DAY = 26 * 3600; // a touch over 24h; daily buckets are keyed by IST date

/**
 * Tunable limits. Daily buckets embed the IST date in their key, so they roll
 * over at local midnight; the window length here is just a cleanup TTL.
 */
export const LIMITS = {
  // Chatbot — the expensive path (Gemini embed + generate per turn).
  chatBurst: { limit: 6, windowSeconds: 30 }, // anti-flood, per IP
  chatDaily: { limit: 30, windowSeconds: DAY }, // questions per visitor per day
  chatGlobal: { limit: 4000, windowSeconds: DAY }, // hard daily ceiling (bill cap)

  // Contact form.
  contactBurst: { limit: 3, windowSeconds: 300 },
  contactDaily: { limit: 12, windowSeconds: DAY },

  // Job application (also triggers a Gemini resume parse + file upload).
  applyBurst: { limit: 3, windowSeconds: 300 },
  applyDaily: { limit: 8, windowSeconds: DAY },
} as const;
