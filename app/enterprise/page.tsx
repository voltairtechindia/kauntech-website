import type { Metadata } from "next";

import EnterpriseForm from "./EnterpriseForm";

export const metadata: Metadata = {
  title: "Enterprise quote",
  description:
    "Tell us the size of your team and what you need, and we'll come back with a price for Kauntech Enterprise.",
  alternates: { canonical: "/enterprise" },
  // Opened from inside the app as a focused form, not a page we want ranking
  // on its own or showing up as a search result next to /pricing.
  robots: { index: false, follow: false },
};

/**
 * Enterprise quote form. Reached from the app's "Get Quote" button, so it runs
 * inside a mobile browser / webview and is laid out for a phone first:
 * `SiteChrome` skips the navbar, footer and chat widget on this route, and the
 * viewport lock below keeps the page exactly one screen wide with no sideways
 * scroll on small devices.
 */
export default function EnterprisePage() {
  return <EnterpriseForm />;
}
