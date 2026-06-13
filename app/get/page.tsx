import { resolveStoreUrl } from "@/lib/referral";

import GetAppClient from "./GetAppClient";

// Device-adaptive, code-less download link. Used wherever a single shareable
// URL has to land an unknown recipient on the right store (e.g. the app's
// "out of referrals" footer). Android -> Google Play, everything else ->
// App Store.
//
// Platform detection now happens on the *client* (see GetAppClient): a previous
// server-side `redirect()` keyed off the request User-Agent would sometimes
// send iPhones to Google Play (and Android to the App Store) because the 307
// could be CDN-cached and replayed across platforms, and in-app browsers /
// link unfurlers send misleading UAs. We resolve both store URLs here (so the
// env overrides still work) and let the device decide in the browser.
export const dynamic = "force-dynamic";

export default function GetAppPage() {
  // resolveStoreUrl never returns null now that both stores are live; fall back
  // defensively so this always lands somewhere installable.
  const iosUrl = resolveStoreUrl("ios")!;
  const androidUrl = resolveStoreUrl("android") ?? iosUrl;

  return <GetAppClient iosUrl={iosUrl} androidUrl={androidUrl} />;
}
