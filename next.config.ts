import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Public Supabase origin (blog cover images / media live in the public
// `blog-media` bucket); needed in img-src / media-src.
const SUPABASE_ORIGIN = "https://ujzchcirgmveryjavfzk.supabase.co";

// The KaunTech *app* Supabase project (auth + ar-models/qr-images storage).
// Used only by the gated /ar studio: auth fetches (connect-src) + model/QR
// images (img-src). Derived from env so it tracks the project, with the known
// origin as a build-time fallback.
const APP_SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_KAUNTECH_APP_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://bhpivcapxyfbqekclorp.supabase.co";
  }
})();

// Google <model-viewer> + MindAR + A-Frame + jsQR for the AR pages load from jsDelivr.
const MODEL_VIEWER_CDN = "https://cdn.jsdelivr.net";
// Vercel Web Analytics debug script (dev); prod serves it same-origin.
const VERCEL_ANALYTICS = "https://va.vercel-scripts.com";

// Google Analytics 4 (gtag.js). The loader script is served by googletagmanager;
// GA4 beacons go to *.google-analytics.com (incl. region1.*) and
// *.analytics.google.com via fetch/sendBeacon (connect-src) and image pixels
// (img-src). Applied to every page so analytics works site-wide.
const GTM_ORIGIN = "https://www.googletagmanager.com";
// GA4 beacons. NB: the *.analytics.google.com wildcard does NOT match the bare
// `analytics.google.com` host (where GA4 + Google Signals send page_view), so it
// is listed explicitly alongside the wildcards.
const GA_ENDPOINTS =
  "https://*.google-analytics.com https://*.analytics.google.com https://analytics.google.com";

// Google Ads (AW-…) conversion + remarketing, fired through the same gtag.js.
// The conversion / view-through logic loads helper scripts from googleadservices
// and googleads.g.doubleclick.net (script-src) and reports as pixels (img-src) +
// beacons (connect-src). GA4 Google Signals + Ads remarketing also reach the
// DoubleClick ad hosts (ad./stats./googleads.*.doubleclick.net) and Google
// ccTLDs for the remarketing user-list pixels. CSP can't wildcard a TLD, so the
// primary market (India: www.google.co.in) is listed next to www.google.com;
// a visitor in another country would have only their remarketing-audience pixel
// (NOT conversions or analytics) blocked. Without these the tags are CSP-blocked.
const GADS_SCRIPT = "https://www.googleadservices.com https://googleads.g.doubleclick.net";
const GADS_ENDPOINTS =
  "https://www.googleadservices.com https://*.doubleclick.net https://www.google.com https://www.google.co.in";

/**
 * Content-Security-Policy.
 *
 * `'unsafe-inline'` stays on script-src/style-src because the App Router emits
 * inline bootstrap scripts + inline <style> (next/font) and we inline JSON-LD,
 * none of which carry a nonce in this setup. XSS surface is already low (no raw
 * HTML is ever rendered — Markdown.tsx disallows it), so this is an acceptable
 * baseline; a nonce-based strict CSP is a future upgrade. `'unsafe-eval'` is
 * added only in dev (Turbopack/HMR needs it) and never ships to production.
 */
// `allowEval` adds 'unsafe-eval' to script-src. A-Frame evaluates strings as JS
// at runtime, so the /ar/* WebAR pages REQUIRE it (without it A-Frame half-inits
// and MindAR scene setup throws). It's scoped to /ar/* only (see headers()) so
// the rest of the site keeps the stricter no-eval policy. Dev always gets it
// (Turbopack/HMR).
const buildCsp = (allowEval: boolean) =>
  [
    "default-src 'self'",
    // 'wasm-unsafe-eval' + blob: are required by the /ar/view WebAR viewer (MindAR
    // runs image tracking in WebAssembly + workers). MODEL_VIEWER_CDN (jsDelivr)
    // also serves MindAR + A-Frame.
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: ${MODEL_VIEWER_CDN} ${VERCEL_ANALYTICS} ${GTM_ORIGIN} ${GADS_SCRIPT}${allowEval || !isProd ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `img-src 'self' data: blob: ${SUPABASE_ORIGIN} ${APP_SUPABASE_ORIGIN} https://api.producthunt.com ${GTM_ORIGIN} ${GA_ENDPOINTS} ${GADS_ENDPOINTS}`,
    // media-src governs <video>/<audio> sources. Uploaded AR clips live on the
    // Supabase origins; the /ar studio + viewer ALSO let owners paste a direct
    // external video/audio file URL, so those pages allow any https: media source.
    `media-src 'self' blob: ${SUPABASE_ORIGIN} ${APP_SUPABASE_ORIGIN}${allowEval ? " https:" : ""}`,
    // SUPABASE_ORIGIN is the site project, home of the public `ar-gallery` bucket
    // (curated 3D models). three.js / a-gltf-model fetch those .glb files here, so
    // it must be in connect-src for both the editor previews and the WebAR viewer.
    `connect-src 'self' blob: data: ${SUPABASE_ORIGIN} ${APP_SUPABASE_ORIGIN} ${MODEL_VIEWER_CDN} ${VERCEL_ANALYTICS} ${GTM_ORIGIN} ${GA_ENDPOINTS} ${GADS_ENDPOINTS} https://script.google.com https://script.googleusercontent.com`,
    "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
    // jsDelivr added for the 8th Wall engine binary: it spins up camera/CV/SLAM
    // workers loaded from the same CDN as its xr.js, so they must be allowed here
    // (MindAR's workers are blob:, already covered).
    `worker-src 'self' blob: ${MODEL_VIEWER_CDN}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

const cspStrict = buildCsp(false); // most of the site — no eval
const cspAr = buildCsp(true); // /ar/* WebAR pages — A-Frame needs eval

// Both Permissions-Policy AND Content-Security-Policy are applied via scoped
// rules below — NOT here — so the /ar/* pages get the camera + an eval-permitting
// CSP. (A page receiving two of the same header has them intersected to the
// most-restrictive, so each must be set by exactly one matching rule per path.)
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const cspHeader = (value: string) => ({ key: "Content-Security-Policy", value });

// camera=() everywhere = no camera. The /ar WebAR pages need the device camera
// (MindAR image tracking + the QR playground), so they get camera=(self).
const permissionsPolicy = (camera: "()" | "(self)") => ({
  key: "Permissions-Policy",
  value: `camera=${camera}, microphone=(), geolocation=(), browsing-topics=()`,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The /api/ar/asset model optimizer runs these native/WASM packages server-side;
  // keep them out of the bundle so they load from node_modules at runtime.
  serverExternalPackages: ["sharp", "meshoptimizer"],
  // sharp loads its native binary via a COMPUTED require (`@img/sharp-<platform>`),
  // which the file tracer can't follow — so the linux-x64 binary never gets bundled
  // into the function and sharp throws "Could not load the sharp module using the
  // linux-x64 runtime" at runtime. Force-include the Linux (glibc) binaries for the
  // one route that optimizes uploaded .glb textures.
  outputFileTracingIncludes: {
    "/api/ar/asset": [
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      // Non-CSP security headers (HSTS, etc.) on everything — no camera, no CSP.
      { source: "/:path*", headers: securityHeaders },
      // AR pages: same-origin camera + the eval-permitting CSP (A-Frame/MindAR).
      { source: "/ar/:path*", headers: [permissionsPolicy("(self)"), cspHeader(cspAr)] },
      // Everywhere else (not /ar or /ar/*): deny the camera + the strict CSP.
      // Negative lookahead so AR pages get exactly one camera policy AND one CSP.
      { source: "/((?!ar(?:/|$)).*)", headers: [permissionsPolicy("()"), cspHeader(cspStrict)] },
    ];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/privacy.html", destination: "/privacy", permanent: true },
      { source: "/terms.html", destination: "/terms", permanent: true },
      { source: "/help.html", destination: "/help", permanent: true },
      { source: "/delete-request.html", destination: "/delete-request", permanent: true },
    ];
  },
};

export default nextConfig;
