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

// Live App Store listing (published 2026-06). Region-less URL so visitors in
// any country land on their local store (Apple redirects by account region);
// IOS_APP_URL can still override it.
const IOS_APP_STORE_URL = "https://apps.apple.com/app/id6769254727";

// Live Google Play listing (published 2026-06). Clean canonical URL (no
// pcampaignid share param); ANDROID_APP_URL can still override it.
const ANDROID_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.kauntech.bizcard";

/**
 * Resolve the store URL for a platform. The app is now live on BOTH stores, so
 * every platform redirects to an installable listing: Android -> Google Play,
 * iOS + desktop/other -> App Store. (No platform returns null anymore, so the
 * "launching soon" interstitial is effectively retired.) Env vars still let us
 * override either store URL without a code change.
 */
export function resolveStoreUrl(platform: Platform): string | null {
  if (platform === "android") return process.env.ANDROID_APP_URL || ANDROID_PLAY_STORE_URL;
  return process.env.IOS_APP_URL || IOS_APP_STORE_URL;
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
