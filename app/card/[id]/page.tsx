import { redirect } from "next/navigation";

import { resolveStoreUrl } from "@/lib/referral";

import CardOpenClient from "./CardOpenClient";

/**
 * Landing page for https://kauntech.com/card/<uuid> — the URL carried in
 * record 0 of every NFC business card the app writes, and in the KaunTech
 * v-card QR.
 *
 * On a phone with the app installed this page is never seen: iOS opens the app
 * through the Universal Link (see /.well-known/apple-app-site-association) and
 * Android through its App Link / NFC intent filter. This is the fallback for
 * everyone else — a tapped tag on a phone without KaunTech, or the link opened
 * on a desktop.
 *
 * It deliberately does NOT render the card's contents. `cards` is RLS'd to its
 * owner and resolve_public_card is authenticated-only, by design: a card id
 * pulled off a tag must not become a public data endpoint. The page's whole job
 * is to get the visitor into the app.
 */
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function CardLandingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Probe / garbage URLs go home rather than advertising the route.
  if (!UUID.test(id || "")) redirect("/");

  const iosUrl = resolveStoreUrl("ios")!;
  const androidUrl = resolveStoreUrl("android") ?? iosUrl;
  return <CardOpenClient cardId={id} iosUrl={iosUrl} androidUrl={androidUrl} />;
}
