/**
 * Referral redirect helpers for /r/[code].
 *
 * The page logs the click (analytics), copies the code to the visitor's
 * clipboard (deferred-deep-link assist for the app's signup auto-fill), and —
 * once the app is published — redirects to the correct store. Store URLs are
 * env-driven so they can be turned on at launch with zero code changes.
 */
import { createHash } from "crypto";

import { getAppSupabase } from "@/lib/appSupabase";

// Matches public.gen_referral_code() in the app's Supabase project.
export const REFERRAL_CODE_RE = /^KT-[A-HJ-NP-Z2-9]{6}$/;

export function isValidReferralCode(code: string): boolean {
  return REFERRAL_CODE_RE.test(code);
}

export type Platform = "ios" | "android" | "other";

export function detectPlatform(ua: string | null): Platform {
  if (!ua) return "other";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "other";
}

/**
 * Resolve the store URL for a platform. Returns null when the app isn't
 * published for that platform yet (env var unset) — the page then shows a
 * "launching soon" state instead of redirecting.
 */
export function resolveStoreUrl(platform: Platform): string | null {
  if (platform === "ios") return process.env.IOS_APP_URL || null;
  if (platform === "android") return process.env.ANDROID_APP_URL || null;
  return null;
}

export async function logReferralClick(opts: {
  code: string;
  userAgent: string | null;
  ip: string | null;
  platform: Platform;
}): Promise<void> {
  // Best-effort analytics — must never block or fail the redirect.
  try {
    const db = getAppSupabase();
    if (!db) return; // app project not configured — skip logging, still redirect
    const ipHash = opts.ip
      ? createHash("sha256").update(opts.ip).digest("hex")
      : null;
    await db.from("referral_clicks").insert({
      code: opts.code,
      user_agent: opts.userAgent,
      platform: opts.platform,
      ip_hash: ipHash,
    });
  } catch {
    /* swallow */
  }
}
