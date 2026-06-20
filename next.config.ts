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
const csp = [
  "default-src 'self'",
  // 'wasm-unsafe-eval' + blob: are required by the /ar/view WebAR viewer (MindAR
  // runs image tracking in WebAssembly + workers). MODEL_VIEWER_CDN (jsDelivr)
  // also serves MindAR + A-Frame.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: ${MODEL_VIEWER_CDN} ${VERCEL_ANALYTICS}${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN} ${APP_SUPABASE_ORIGIN} https://api.producthunt.com`,
  `media-src 'self' blob: ${SUPABASE_ORIGIN} ${APP_SUPABASE_ORIGIN}`,
  `connect-src 'self' blob: data: ${APP_SUPABASE_ORIGIN} ${MODEL_VIEWER_CDN} ${VERCEL_ANALYTICS} https://script.google.com https://script.googleusercontent.com`,
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

// Permissions-Policy is applied via scoped rules below — NOT here — so the AR
// pages can enable the camera. (A page getting two Permissions-Policy headers
// has them intersected to the most-restrictive, so the policy must be set by
// exactly one matching rule per path.)
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

// camera=() everywhere = no camera. The /ar WebAR pages need the device camera
// (MindAR image tracking + the QR playground), so they get camera=(self).
const permissionsPolicy = (camera: "()" | "(self)") => ({
  key: "Permissions-Policy",
  value: `camera=${camera}, microphone=(), geolocation=(), browsing-topics=()`,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      // Base security headers on everything (CSP, HSTS, etc.) — no camera policy.
      { source: "/:path*", headers: securityHeaders },
      // AR pages: allow the same-origin camera.
      { source: "/ar/:path*", headers: [permissionsPolicy("(self)")] },
      // Everywhere else (not /ar or /ar/*): deny the camera. Negative lookahead
      // so AR pages never also receive the restrictive policy.
      { source: "/((?!ar(?:/|$)).*)", headers: [permissionsPolicy("()")] },
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
