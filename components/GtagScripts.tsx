import Script from "next/script";
import { GA_ID, ADS_ID } from "@/lib/gtag";

// Loads Google Analytics 4 (gtag.js) ONCE, then configures BOTH the GA4 property
// and the Google Ads conversion account on the same tag, and wires lightweight
// scroll-depth + outbound-link tracking. Rendered a single time from
// app/layout.tsx (do not also inline gtag elsewhere or pageviews double-count).
// CSP allowances for every Google origin used here live in next.config.ts.
//
// strategy="lazyOnload": gtag.js + the Ads container it chains are ~370 KB of
// JS with 300 ms+ of main-thread tasks — loading them during the load window
// was the site's single largest "unused JavaScript" / long-task source on
// PageSpeed. Post-load loading loses no data: page_view fires when gtag.js
// processes the queued config, and events fired before that sit in the
// dataLayer queue (see lib/gtag.ts).
export default function GtagScripts() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="lazyOnload"
      />
      <Script id="gtag-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
          gtag('config', '${ADS_ID}');
        `}
      </Script>
      <Script id="gtag-engagement" strategy="lazyOnload">
        {`
          (function() {
            // Queue-safe shim: pushing arguments onto dataLayer is exactly what
            // gtag() does, so events recorded before gtag.js arrives are
            // processed when it loads — no dependency on script order.
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
