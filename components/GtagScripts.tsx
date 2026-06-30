import Script from "next/script";
import { GA_ID, ADS_ID } from "@/lib/gtag";

// Loads Google Analytics 4 (gtag.js) ONCE, then configures BOTH the GA4 property
// and the Google Ads conversion account on the same tag, and wires lightweight
// scroll-depth + outbound-link tracking. Rendered a single time from
// app/layout.tsx (do not also inline gtag elsewhere or pageviews double-count).
// CSP allowances for every Google origin used here live in next.config.ts.
export default function GtagScripts() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
          gtag('config', '${ADS_ID}');
        `}
      </Script>
      <Script id="gtag-engagement" strategy="afterInteractive">
        {`
          (function() {
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
