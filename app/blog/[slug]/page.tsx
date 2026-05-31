import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import BlogMedia from "@/components/BlogMedia";
import Markdown from "@/components/Markdown";
import {
  getPublishedPost,
  listPublishedSlugs,
  listRelatedPosts,
} from "@/lib/blog/db";
import { formatDate } from "@/lib/blog/util";

const SITE_URL = "https://www.kauntech.com";

// ISR: render once, refresh every 5 min so edits/new posts go live without deploy.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const slugs = await listPublishedSlugs();
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Post not found" };

  const title = post.seo?.title ?? post.title;
  const description =
    post.seo?.description ?? post.excerpt ?? `${post.title} — Kauntech Blog`;
  const ogImage = post.seo?.og_image ?? post.cover_image?.url;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${post.slug}`,
      publishedTime: post.published_at ?? undefined,
      authors: [post.author],
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const related = await listRelatedPosts(post.slug, 3);
  const url = `${SITE_URL}/blog/${post.slug}`;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.cover_image?.url ? [post.cover_image.url] : undefined,
    datePublished: post.published_at ?? undefined,
    dateModified: post.updated_at,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "Kauntech",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/assets/logo-gold.webp`,
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    keywords: post.tags?.join(", ") || undefined,
  };

  return (
    <main className="blog-main blog-article" style={{ paddingTop: 80 }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

      <article className="container">
        <nav className="blog-breadcrumb">
          <Link href="/blog">← All articles</Link>
        </nav>

        <header className="blog-article-header">
          {post.tags?.length ? (
            <div className="blog-tags">
              {post.tags.map((t) => (
                <span key={t} className="blog-card-tag">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <h1>{post.title}</h1>
          {post.excerpt ? <p className="blog-lede">{post.excerpt}</p> : null}
          <div className="blog-article-meta">
            <span>{post.author}</span>
            <span>· {formatDate(post.published_at)}</span>
            {post.reading_minutes ? (
              <span>· {post.reading_minutes} min read</span>
            ) : null}
          </div>
        </header>

        {post.cover_image?.url ? (
          <figure className="blog-cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.cover_image.url}
              alt={post.cover_image.alt ?? post.title}
              decoding="async"
            />
          </figure>
        ) : null}

        <div className="blog-body">
          <Markdown>{post.body_md}</Markdown>
        </div>

        {post.media?.length ? (
          <section className="blog-gallery">
            {post.media.map((item, i) => (
              <BlogMedia key={`${item.type}-${i}`} item={item} />
            ))}
          </section>
        ) : null}
      </article>

      {related.length ? (
        <section className="container blog-related">
          <h2>Read next</h2>
          <div className="blog-grid">
            {related.map((p) => (
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
                  <h2>{p.title}</h2>
                  {p.excerpt ? <p>{p.excerpt}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
