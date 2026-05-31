# Blog Pipeline — n8n → Supabase → Site

The site **never** authors blog posts. n8n creates them and pushes them to the
site; the site only **renders** what's in Supabase. Photos and videos are
supported.

```
            ┌──────────────────────────────────────────────────────────┐
  n8n  ───► │ 1. (optional) upload photos / short videos                │
            │      → Supabase Storage bucket  "blog-media"  (public)     │
            │      → get public URLs                                     │
            │ 2. assemble post JSON (markdown body + media[] URLs)       │
            │ 3. HTTP POST  https://www.kauntech.com/api/blog            │
            │      header  X-Admin-Key: <ADMIN_API_KEY>                  │
            └───────────────┬──────────────────────────────────────────┘
                            ▼
                 /api/blog  (server, service-role key)
                   • upsert row into  blog_posts   (by slug)
                   • if published → embed + upsert into RAG  documents
                            ▼
        ┌───────────────────────────────────────────────┐
        │  Site renders (ISR, ~5 min):                   │
        │   /blog            → card grid                 │
        │   /blog/<slug>     → article + photo/video     │
        │  Chatbot can now cite the post (RAG)           │
        └───────────────────────────────────────────────┘
```

Why this shape: the Supabase **service-role** key and the Gemini key stay only
inside the site. n8n holds just one secret — `ADMIN_API_KEY` — and one URL.
(If you'd rather have n8n upload media straight to Storage, it needs the service
key too; see "Media option B".)

---

## 0. One-time setup

Already done by migration `0005_blog.sql`:

- Table `public.blog_posts` (RLS on, no public policies → server-only).
- Public Storage bucket `blog-media` (100 MB/file cap; images + mp4/webm/mov).

You need:

- `ADMIN_API_KEY` set on the site (Vercel env) — the n8n shared secret.
- `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_API_KEY` already set (RAG).

Generate a strong admin key once: `openssl rand -hex 32`.

---

## 1. The post payload

`POST https://www.kauntech.com/api/blog`
Headers: `Content-Type: application/json`, `X-Admin-Key: <ADMIN_API_KEY>`

```jsonc
{
  "slug": "offline-networking-at-trade-shows",   // optional; derived from title if omitted
  "title": "How to Win Trade Shows Without Wi-Fi",
  "excerpt": "Capture 200 cards in a dead zone and sync later.",
  "body_md": "## The problem\n\nConvention halls kill Wi-Fi...\n\n![Booth scan](https://ujzchcirgmveryjavfzk.supabase.co/storage/v1/object/public/blog-media/posts/booth.webp)\n\nMore text in **Markdown**.",
  "cover_image": {
    "url": "https://ujzchcirgmveryjavfzk.supabase.co/storage/v1/object/public/blog-media/posts/cover.webp",
    "alt": "Salesperson scanning a card at a busy booth"
  },
  "media": [
    { "type": "image", "url": ".../blog-media/posts/gallery-1.webp", "alt": "Scan result", "caption": "OCR result in 0.4s" },
    { "type": "video", "url": ".../blog-media/posts/demo.mp4", "poster": ".../blog-media/posts/demo-poster.webp", "caption": "30-second capture demo" },
    { "type": "embed", "provider": "youtube", "url": "https://youtu.be/dQw4w9WgXcQ", "caption": "Full walkthrough" }
  ],
  "tags": ["offline", "events", "ocr"],
  "author": "Kauntech",
  "seo": { "title": "Offline Card Scanning at Trade Shows", "description": "...", "og_image": ".../cover.webp" },
  "status": "published",          // "draft" | "published" | "archived"  (default published)
  "published_at": "2026-06-01T09:00:00Z",  // optional; defaults to now when publishing
  "reading_minutes": 5            // optional; auto-estimated from body_md
}
```

Notes:
- **Only `title` is required.** Everything else has sensible defaults.
- `body_md` is **Markdown** (GFM: tables, lists, links, inline images). Raw HTML
  is ignored for safety — use Markdown / the `media` array instead.
- **Photos** → `cover_image`, inline `![](url)` in `body_md`, or `media` items
  with `type:"image"`.
- **Videos** → `media` items: `type:"video"` for an mp4/webm you host in the
  bucket, or `type:"embed"` for YouTube/Vimeo (best for long videos — keeps them
  off your Supabase egress).
- Re-POST the **same slug** to update a post. Set `status:"draft"` to pull it off
  the site (it's also removed from the chatbot's knowledge).
- Batch: send `{ "posts": [ {...}, {...} ] }` to upsert several at once.

Response: `{ "ok": true, "count": 1, "posts": [{ "slug": "...", "status": "published", "url": "https://www.kauntech.com/blog/..." }] }`

Other verbs:
- `GET /api/blog` (with `X-Admin-Key`) → `{ total, published, draft, archived }`.
- `DELETE /api/blog?slug=<slug>` (with `X-Admin-Key`) → removes post + RAG doc.

---

## 2. n8n workflow

### Minimal (no media, or media already on YouTube/external)

1. **Trigger** — Schedule, Webhook, RSS Feed Read, or Manual.
2. **(optional) AI/content node** — generate `title`, `body_md`, `excerpt`,
   `tags`. Map outputs into the JSON above.
3. **HTTP Request** node:
   - Method `POST`, URL `https://www.kauntech.com/api/blog`
   - Header `X-Admin-Key` = your `ADMIN_API_KEY` (store as an n8n credential).
   - Body: JSON → the payload above.

That's the whole pipeline. The site shows the post within ~5 minutes (ISR), and
the chatbot can cite it immediately.

### With uploaded photos / videos

Insert media-upload steps before the HTTP Request.

**Media option A — let the site stay the only key-holder (no media upload in n8n):**
Host images/videos anywhere with a public URL (YouTube, Vimeo, Cloudinary, an
existing CDN) and just pass those URLs in `cover_image` / `media`. Simplest, no
service key in n8n.

**Media option B — upload into Supabase Storage from n8n:**
For each file (HTTP Download / read binary → then an HTTP Request node):

- Method `POST`
- URL `https://ujzchcirgmveryjavfzk.supabase.co/storage/v1/object/blog-media/posts/<filename>`
- Headers:
  - `Authorization: Bearer <SUPABASE_SERVICE_KEY>`
  - `apikey: <SUPABASE_SERVICE_KEY>`
  - `Content-Type: <image/webp | video/mp4 | ...>`
  - `x-upsert: true`  (overwrite if the path exists)
- Body: the binary file.

Public URL of the uploaded object (use this in the payload):
`https://ujzchcirgmveryjavfzk.supabase.co/storage/v1/object/public/blog-media/posts/<filename>`

> n8n also ships a **Supabase** node — you can use its Storage operations instead
> of raw HTTP if you prefer. Use a unique path per post, e.g.
> `posts/<slug>/<filename>` to avoid collisions.

Then feed those public URLs into the post JSON and POST to `/api/blog` as above.

---

## 3. Quick test (curl)

```bash
ADMIN_KEY="paste-your-admin-key"
curl -sS -X POST https://www.kauntech.com/api/blog \
  -H "Content-Type: application/json" \
  -H "X-Admin-Key: $ADMIN_KEY" \
  -d '{
    "title": "Hello from n8n",
    "excerpt": "First automated post.",
    "body_md": "## It works\n\nThis post came from the pipeline.",
    "tags": ["test"],
    "status": "published"
  }'
# → visit https://www.kauntech.com/blog  (allow up to ~5 min for ISR, or it
#   appears on the first request after the revalidate window)
# clean up:  curl -X DELETE "https://www.kauntech.com/api/blog?slug=hello-from-n8n" -H "X-Admin-Key: $ADMIN_KEY"
```

---

## 4. How rendering + freshness works

- `/blog` and `/blog/<slug>` are **server-rendered with ISR** (`revalidate = 300`).
  A new/updated post shows up within ~5 minutes (or on the next request after the
  window). To make posts appear instantly, add an on-demand revalidation step
  later (call `revalidatePath('/blog')` from a small authed route) — not required
  for v1.
- Drafts and future-dated posts are never shown (the query filters
  `status='published'` and `published_at <= now()`).
- Publishing also embeds the post into the RAG store (`documents.doc_type='blog'`,
  `external_id=slug`), so the chat widget can answer from it. Un-publishing or
  deleting removes it from RAG too.
