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
  // Server-side platform is only used for click analytics. The actual store
  // redirect is decided on the client (see RedirectClient) from the real
  // device, so a CDN-cached response or a misleading in-app/unfurler UA can't
  // send an iPhone to Google Play (or Android to the App Store).
  const platform = detectPlatform(ua);

  await logReferralClick({ code, userAgent: ua, ip, platform });

  // Pass both live store URLs (env overrides preserved) and let the browser pick.
  const iosUrl = resolveStoreUrl("ios")!;
  const androidUrl = resolveStoreUrl("android") ?? iosUrl;
  return <RedirectClient code={code} iosUrl={iosUrl} androidUrl={androidUrl} />;
}
