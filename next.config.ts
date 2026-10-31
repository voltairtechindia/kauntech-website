import type { NextConfig } from "next";

// Static export for GitHub Pages. There is no server: every page is built to
// HTML at build time (blog, careers and FAQs are read from Supabase during the
// build), forms post to the Website Leads Google Apps Script (lib/leads.ts), and
// the Pages workflow rebuilds the site on every push and every few hours.
//
// What a static host cannot do, and where it went:
// - Security headers (CSP, HSTS, camera policy): GitHub Pages has no custom
//   headers.
// - Redirects: /privacy.html, /terms.html, /help.html, /delete-request.html and
//   /index.html are the exported pages themselves now.
// - /card/<id>, /r/<code> and /ar/view/<id>: handled in the browser by the 404
//   page (app/not-found.tsx), since GitHub Pages serves 404.html for any
//   unknown path.
// - The AR studio, the enterprise seat console and every /api route need a
//   server; they live on the `vercel-full` branch until they get a host.
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  poweredByHeader: false,
  // Inline each page's CSS into the HTML instead of render-blocking <link>
  // stylesheets (Lighthouse flagged ~900 ms of blocked first paint on 4G).
  experimental: { inlineCss: true },
  images: {
    // No image optimizer on a static host; images are served as uploaded.
    unoptimized: true,
  },
};

export default nextConfig;
