-- Cover images are optional. 0005 created blog_posts.cover_image as
-- `not null default '{}'`, but POST /api/blog sends an explicit NULL when a post
-- has no cover, which violated the constraint and 500'd every cover-less post.
-- Make the column nullable so NULL = "no cover" (matches the CoverImage | null type
-- and the `cover_image?.url` rendering).
alter table public.blog_posts alter column cover_image drop not null;
alter table public.blog_posts alter column cover_image drop default;
