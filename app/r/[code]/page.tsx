import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  isValidReferralCode,
  detectPlatform,
  resolveStoreUrl,
  logReferralClick,
} from "@/lib/referral";

import RedirectClient from "./RedirectClient";

// Always run server-side per request (we read headers + log the click).
export const dynamic = "force-dynamic";

export default async function ReferralRedirectPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = (raw || "").toUpperCase();

  // Garbage / probe URLs just go home — no logging, no clipboard.
  if (!isValidReferralCode(code)) redirect("/");

  const h = await headers();
  const ua = h.get("user-agent");
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || null;
  const platform = detectPlatform(ua);

  await logReferralClick({ code, userAgent: ua, ip, platform });

  const storeUrl = resolveStoreUrl(platform);
  return <RedirectClient code={code} storeUrl={storeUrl} />;
}
