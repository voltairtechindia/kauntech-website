/** Shared types for the dynamic blog (DB rows <-> rendered posts). */

export interface CoverImage {
  url: string;
  alt?: string;
}

/** One item in a post's media gallery: a photo, a self-hosted video, or an embed. */
export type MediaItem =
  | { type: "image"; url: string; alt?: string; caption?: string }
  | { type: "video"; url: string; poster?: string; caption?: string }
  | {
      type: "embed";
      url: string;
      provider?: "youtube" | "vimeo" | string;
      caption?: string;
    };

export interface BlogSeo {
  title?: string;
  description?: string;
  og_image?: string;
}

export type BlogStatus = "draft" | "published" | "archived";

/** A full blog post as stored in / returned from Supabase. */
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_image: CoverImage | null;
  media: MediaItem[];
  tags: string[];
  author: string;
  seo: BlogSeo;
  status: BlogStatus;
  reading_minutes: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Lightweight shape used for listing cards (no body). */
export type BlogPostCard = Pick<
  BlogPost,
  | "slug"
  | "title"
  | "excerpt"
  | "cover_image"
  | "tags"
  | "author"
  | "reading_minutes"
  | "published_at"
>;

/** Payload accepted by POST /api/blog (from n8n or manual tooling). */
export interface BlogUpsert {
  slug: string;
  title: string;
  excerpt?: string | null;
  body_md?: string;
  cover_image?: CoverImage | null;
  media?: MediaItem[];
  tags?: string[];
  author?: string;
  seo?: BlogSeo;
  status?: BlogStatus;
  reading_minutes?: number | null;
  published_at?: string | null;
}
