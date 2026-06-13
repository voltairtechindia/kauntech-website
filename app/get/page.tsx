import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { detectPlatform, resolveStoreUrl } from "@/lib/referral";

// Device-adaptive, code-less download link. Used wherever a single shareable
// URL has to land an unknown recipient on the right store (e.g. the app's
// "out of referrals" footer). Android -> Google Play, everything else ->
// App Store. Mirrors the /r/[code] platform detection without the referral
// code / clipboard / click-logging.
export const dynamic = "force-dynamic";

export default async function GetAppPage() {
  const h = await headers();
  const platform = detectPlatform(h.get("user-agent"));
  // resolveStoreUrl never returns null now that both stores are live, but fall
  // back to the App Store defensively so this always lands somewhere.
  const url = resolveStoreUrl(platform) ?? resolveStoreUrl("ios")!;
  redirect(url);
}
