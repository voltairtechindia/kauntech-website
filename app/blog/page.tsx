import type { Metadata } from "next";
import Link from "next/link";

import { listPublishedPosts } from "@/lib/blog/db";
import { formatDate } from "@/lib/blog/util";

const SITE_URL = "https://www.kauntech.com";

// Revalidate the listing every 5 min so new n8n posts appear without a redeploy.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog — Offline Networking, OCR & DPDP Compliance Insights",
  description:
    "Guides, product updates, and field notes on offline business card scanning, on-device AI enrichment, and India's DPDP Act 2023 — from the Kauntech team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Kauntech Blog",
    description:
      "Offline networking, on-device OCR, AI contact enrichment, and DPDP compliance — insights from the Kauntech team.",
    url: "/blog",
    type: "website",
  },
};

export default async function BlogIndexPage() {
  const posts = await listPublishedPosts();

  const listLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Kauntech Blog",
    url: `${SITE_URL}/blog`,
    blogPost: posts.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.published_at ?? undefined,
      author: { "@type": "Organization", name: p.author },
    })),
  };

  return (
    <main className="blog-main" style={{ paddingTop: 80 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(listLd) }}
      />

      <section className="blog-hero container">
        <span className="blog-eyebrow">The Kauntech Blog</span>
        <h1>Offline networking, decoded.</h1>
        <p>
          Product updates, field notes, and practical guides on on-device OCR, AI
          contact enrichment, and staying DPDP Act 2023 compliant.
        </p>
      </section>

      <section className="container">
        {posts.length === 0 ? (
          <p className="blog-empty">
            No posts yet — check back soon. (New articles publish automatically
            from our content pipeline.)
          </p>
        ) : (
          <div className="blog-grid">
            {posts.map((p) => (
              <Link key={p.slug} href={`/blog/${p.slug}`} className="blog-card">
                <div className="blog-card-media">
                  {p.cover_image?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.cover_image.url}
                      alt={p.cover_image.alt ?? p.title}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="blog-card-media--placeholder">
                      <i className="fa-solid fa-newspaper" />
                    </div>
                  )}
                </div>
                <div className="blog-card-body">
                  {p.tags?.length ? (
                    <span className="blog-card-tag">{p.tags[0]}</span>
                  ) : null}
                  <h2>{p.title}</h2>
                  {p.excerpt ? <p>{p.excerpt}</p> : null}
                  <div className="blog-card-meta">
                    <span>{formatDate(p.published_at)}</span>
                    {p.reading_minutes ? (
                      <span>· {p.reading_minutes} min read</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
