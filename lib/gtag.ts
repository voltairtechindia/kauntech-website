// Google Analytics 4 + Google Ads tag helpers.
//
// The base gtag.js loads ONCE site-wide via <GtagScripts /> (rendered in
// app/layout.tsx); these helpers just push events onto the shared queue.
// CSP allowances for every Google origin used here (googletagmanager,
// google-analytics, googleadservices, doubleclick, www.google.com) live in
// next.config.ts — keep them in sync if you add a new endpoint.

// The Google tag for kauntech.com. GT-55JP2X3S and G-128KNMQQRX are two IDs for
// the SAME tag, not two tags — fetching googletagmanager.com/gtag/js?id=<either>
// returns the same bootstrap listing both. So the base tag is loaded and
// configured with the canonical GT- ID exactly once (that is the ID Google's
// console and Tag Assistant look for when reporting "connected").
export const TAG_ID = "GT-55JP2X3S";

// GA4 destination of TAG_ID — property 543623669 ("Kauntech React").
// Reference only: NEVER also `gtag('config', GA_ID)`, that is the same
// destination configured twice and every page_view would double-count.
export const GA_ID = "G-128KNMQQRX";

// Google Ads conversion account, shared with voltairtech.com. Configured
// separately because it is its own destination, not one of TAG_ID's.
export const ADS_ID = "AW-18083299030";

// Real published store identifiers (source of truth: the live store listings +
// app/.well-known/apple-app-site-association). NOTE: the marketing brief listed
// "com.kauntech.visitingcard", but the actual Android package is below.
const ANDROID_PACKAGE = "com.kauntech.bizcard";
const APPLE_APP_ID = "6769254727";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// gtag.js loads lazily (post-load, see GtagScripts.tsx), so an event can fire
// before window.gtag exists. Pushing the arguments object onto dataLayer is
// exactly what gtag() itself does — gtag.js drains the queue when it arrives,
// so early events are delivered instead of dropped.
function fire(...args: unknown[]) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag(...args);
  } else {
    (window.dataLayer = window.dataLayer || []).push(arguments);
  }
}

// Play Store install intent — fire on the Google Play button click.
export function appInstall() {
  fire("event", "conversion", { send_to: `${ADS_ID}/app_install` });
  fire("event", "app_install_click", {
    event_category: "engagement",
    event_label: "play_store_button",
    app_package: ANDROID_PACKAGE,
  });
}

// App Store install intent — fire on the Apple App Store button click.
export function appStoreInstall() {
  fire("event", "conversion", { send_to: `${ADS_ID}/app_install` });
  fire("event", "app_install_click", {
    event_category: "engagement",
    event_label: "app_store_button",
    app_store_id: APPLE_APP_ID,
  });
}

// Contact form lead — fire after a SUCCESSFUL submission (see Contact.tsx).
export function contactForm() {
  fire("event", "generate_lead", {
    send_to: ADS_ID,
    event_category: "contact",
    event_label: "contact_form",
  });
}

// Generic event passthrough.
export function event(name: string, params?: Record<string, string | number>) {
  fire("event", name, params);
}
