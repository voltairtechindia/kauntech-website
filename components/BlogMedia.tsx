/**
 * Renders a single blog media item — a photo, a self-hosted video, or an
 * external embed (YouTube/Vimeo). Pure server component (no client hooks).
 */
import type { MediaItem } from "@/lib/blog/types";

/** Convert a watch/share URL into an embeddable iframe src. */
function toEmbedSrc(url: string, provider?: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");

    if (provider === "youtube" || /youtube\.com|youtu\.be/.test(host)) {
      let id = "";
      if (host === "youtu.be") id = u.pathname.slice(1);
      else if (u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
      else id = u.searchParams.get("v") ?? "";
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : url;
    }

    if (provider === "vimeo" || /vimeo\.com/.test(host)) {
      const id = u.pathname.split("/").filter(Boolean).pop() ?? "";
      return id ? `https://player.vimeo.com/video/${id}` : url;
    }
  } catch {
    /* fall through to raw url */
  }
  return url;
}

export default function BlogMedia({ item }: { item: MediaItem }) {
  if (item.type === "image") {
    return (
      <figure className="blog-media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.url} alt={item.alt ?? ""} loading="lazy" decoding="async" />
        {item.caption ? <figcaption>{item.caption}</figcaption> : null}
      </figure>
    );
  }

  if (item.type === "video") {
    return (
      <figure className="blog-media">
        <video controls preload="metadata" poster={item.poster} playsInline>
          <source src={item.url} />
          Your browser does not support embedded video.
        </video>
        {item.caption ? <figcaption>{item.caption}</figcaption> : null}
      </figure>
    );
  }

  // embed (YouTube / Vimeo / other)
  return (
    <figure className="blog-media">
      <div className="blog-embed">
        <iframe
          src={toEmbedSrc(item.url, item.provider)}
          title={item.caption ?? "Embedded video"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
      {item.caption ? <figcaption>{item.caption}</figcaption> : null}
    </figure>
  );
}
