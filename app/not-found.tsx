import type { Metadata } from "next";
import Link from "next/link";

import PathLanding from "@/components/landing/PathLanding";
import { resolveStoreUrl } from "@/lib/referral";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

// GitHub Pages serves this page (404.html) for every path it has no file for.
// Before React loads, this script:
// - sends old AR viewer links (/ar/view/<cardId>) to the static viewer page,
// - drops a trailing slash ("/pricing/" -> "/pricing"), where the file lives,
// - hides the 404 text on /card/<id> and /r/<code>, which PathLanding renders
//   as their landing pages instead.
const RESCUE = `(function(){var p=location.pathname,q=location.search;var m=p.match(/^\\/ar\\/view\\/([^\\/]+)\\/?$/);if(m){location.replace("/ar/view?card="+encodeURIComponent(decodeURIComponent(m[1]))+(q?"&"+q.slice(1):""));return;}if(/^\\/(card|r)\\/[^\\/]+\\/?$/.test(p)){document.documentElement.className+=" is-landing";return;}if(p.length>1&&p.charAt(p.length-1)==="/"){location.replace(p.replace(/\\/+$/,"")+q+location.hash);}})();`;

export default function NotFound() {
  const iosUrl = resolveStoreUrl("ios")!;
  const androidUrl = resolveStoreUrl("android") ?? iosUrl;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: RESCUE }} />
      <style>{`.is-landing .nf-default{visibility:hidden}`}</style>
      <PathLanding iosUrl={iosUrl} androidUrl={androidUrl}>
        <main className="nf-default" style={{ paddingTop: 120, paddingBottom: 120 }}>
          <div className="container" style={{ textAlign: "center", maxWidth: 560 }}>
            <p className="section-label">404</p>
            <h1 style={{ fontSize: "2.2rem", margin: "12px 0" }}>Page not found</h1>
            <p style={{ opacity: 0.8, marginBottom: 28 }}>
              The page you are looking for does not exist or has moved.
            </p>
            <Link className="btn-primary" href="/">
              Back to Kauntech
            </Link>
          </div>
        </main>
      </PathLanding>
    </>
  );
}
