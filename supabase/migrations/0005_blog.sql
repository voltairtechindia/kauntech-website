-- =====================================================================
-- Migration 0005: dynamic blog (n8n -> Supabase -> site) with media
--
-- Adds:
--   * blog_posts          — one row per article, with photo + video media
--   * blog-media bucket    — public Storage bucket for uploaded images/clips
--   * public read policy   — anon can read objects in blog-media (public CDN)
--
-- Security posture matches the rest of the project: RLS is ON with NO policies
-- on blog_posts, so the anon/public key gets ZERO access. The Next.js server
-- reads + writes with the service-role key (which bypasses RLS). n8n never
-- touches the DB directly — it POSTs to /api/blog. See BLOG_PIPELINE.md.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- =====================================================================
-- blog_posts
-- =====================================================================
create table if not exists blog_posts (
    id              uuid        primary key default gen_random_uuid(),
    slug            text        not null unique,            -- URL: /blog/<slug>
    title           text        not null,
    excerpt         text,                                    -- short summary / card teaser
    body_md         text        not null default '',         -- article body (Markdown)
    -- Hero image shown at the top of the post + in listing cards:
    --   { "url": "...", "alt": "..." }
    cover_image     jsonb       not null default '{}'::jsonb,
    -- Ordered media gallery (photos + videos), each item one of:
    --   { "type": "image",  "url": "...", "alt": "...",  "caption": "..." }
    --   { "type": "video",  "url": "...mp4", "poster": "...", "caption": "..." }
    --   { "type": "embed",  "url": "https://youtube.com/...", "provider": "youtube", "caption": "..." }
    media           jsonb       not null default '[]'::jsonb,
    tags            text[]      not null default '{}',
    author          text        not null default 'Kauntech',
    -- SEO overrides: { "title": "...", "description": "...", "og_image": "..." }
    seo             jsonb       not null default '{}'::jsonb,
    status          text        not null default 'draft'
                                check (status in ('draft', 'published', 'archived')),
    reading_minutes int,
    published_at    timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

-- Listing query: published posts, newest first.
create index if not exists blog_posts_published_idx
    on blog_posts (published_at desc)
    where status = 'published';
create index if not exists blog_posts_status_idx on blog_posts (status);
create index if not exists blog_posts_tags_idx   on blog_posts using gin (tags);

-- keep updated_at fresh (reuses the helper from 0001_init.sql)
drop trigger if exists trg_blog_posts_updated_at on blog_posts;
create trigger trg_blog_posts_updated_at
    before update on blog_posts
    for each row execute function set_updated_at();

-- RLS ON, no policies -> anon/authenticated get zero access; service_role
-- bypasses RLS. The site renders posts server-side with the service-role key.
alter table blog_posts enable row level security;

-- =====================================================================
-- Storage: public bucket for blog photos + short videos
-- =====================================================================
-- 100 MB per-file cap: fine for images and short clips. Long videos should be
-- hosted on YouTube/Vimeo and referenced as a { type:"embed" } media item.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'blog-media',
    'blog-media',
    true,
    104857600,
    array[
        'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
        'video/mp4', 'video/webm', 'video/quicktime'
    ]
)
on conflict (id) do update
    set public            = excluded.public,
        file_size_limit   = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;

-- Public READ on objects in the blog-media bucket (the bucket is public, but an
-- explicit policy also allows anon listing). Writes happen via the service-role
-- key (n8n -> /api/blog, or n8n -> Storage API directly), which bypasses RLS.
drop policy if exists "blog-media public read" on storage.objects;
create policy "blog-media public read"
    on storage.objects for select
    to public
    using (bucket_id = 'blog-media');
