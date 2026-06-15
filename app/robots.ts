import type { MetadataRoute } from "next";

const SITE_URL = "https://www.kauntech.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /delete-request: DPDP erasure form, no SEO value.
        // /r/, /get: referral + device-adaptive redirectors (no content to
        // index; crawling them just generates "Page with redirect" noise).
        disallow: ["/delete-request", "/r/", "/get"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
