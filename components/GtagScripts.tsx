import Script from "next/script";
import { TAG_ID, ADS_ID } from "@/lib/gtag";

// Loads the Kauntech Google tag (gtag.js) ONCE, then configures BOTH that tag
// (which routes to GA4 G-128KNMQQRX) and the Google Ads conversion account, and
// wires lightweight scroll-depth + outbound-link tracking. Rendered a single
// time from app/layout.tsx (do not also inline gtag elsewhere or pageviews
// double-count). CSP allowances for every Google origin live in next.config.ts.
//
// Configure TAG_ID only — GA_ID is the same tag's other ID, so configuring both
// would send two page_views per pageview. See the note in lib/gtag.ts.
//
// strategy="afterInteractive": gtag.js is heavy (~370 KB with the Ads container
// it chains), so this used to be lazyOnload for PageSpeed. That cost more than
// it saved: the tag only mounted after load + idle, which (a) left Google's
// installation check reporting the tag as not connected, and (b) stranded
// conversions - a store-button click queues its event in dataLayer, and if the
// visitor leaves for the store before gtag.js arrives the queue dies with the
// page. Conversion delivery outranks the TBT saving, especially with Ads
// bidding driven by these signals. Only the engagement listeners below stay
// lazy; they fire long after load anyway.
export default function GtagScripts() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${TAG_ID}');
          gtag('config', '${ADS_ID}');
        `}
      </Script>
      <Script id="gtag-engagement" strategy="lazyOnload">
        {`
          (function() {
            // Queue-safe shim: pushing arguments onto dataLayer is exactly what
            // gtag() does, so events recorded before gtag.js arrives are
            // processed when it loads - no dependency on script order.
            function gtag(){ (window.dataLayer = window.dataLayer || []).push(arguments); }
            var depths = [25, 50, 75, 90], fired = [];
            window.addEventListener('scroll', function() {
              var scrollable = document.body.scrollHeight - window.innerHeight;
              if (scrollable <= 0) return;
              var pct = Math.round((window.scrollY / scrollable) * 100);
              depths.forEach(function(d) {
                if (pct >= d && fired.indexOf(d) === -1) {
                  fired.push(d);
                  gtag('event', 'scroll_depth', { event_category: 'engagement', event_label: d + '%' });
                }
              });
            }, { passive: true });
            document.addEventListener('click', function(e) {
              var link = e.target && e.target.closest ? e.target.closest('a') : null;
              if (link && link.hostname && link.hostname !== window.location.hostname) {
                gtag('event', 'click', { event_category: 'outbound', event_label: link.href });
              }
            });
          })();
        `}
      </Script>
    </>
  );
}
