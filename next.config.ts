import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Public Supabase origin (blog cover images / media live in the public
// `blog-media` bucket); needed in img-src / media-src.
const SUPABASE_ORIGIN = "https://ujzchcirgmveryjavfzk.supabase.co";

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
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
  "font-src 'self' https://cdnjs.cloudflare.com data:",
  `img-src 'self' data: blob: ${SUPABASE_ORIGIN}`,
  `media-src 'self' ${SUPABASE_ORIGIN}`,
  "connect-src 'self' https://script.google.com https://script.googleusercontent.com https://va.vercel-scripts.com",
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/privacy.html", destination: "/privacy", permanent: true },
      { source: "/terms.html", destination: "/terms", permanent: true },
      { source: "/delete-request.html", destination: "/delete-request", permanent: true },
    ];
  },
};

export default nextConfig;
