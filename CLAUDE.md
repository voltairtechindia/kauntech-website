# Kauntech Website — CLAUDE.md

## Project Overview
Marketing website for **Kauntech** — an offline-first business card scanner app for Android/iOS. Built with Next.js 15 App Router + TypeScript. Deployed at `https://kauntech.com`.

Key product angle: 100% offline OCR, DPDP Act 2023 compliant, AI contact enrichment.

## Stack
- **Framework**: Next.js 15 (App Router), React 19, TypeScript 5
- **Styling**: Plain CSS (`globals.css`, `extra.css`) — no Tailwind, no CSS-in-JS
- **Icons**: Font Awesome 6 via CDN (loaded in `app/layout.tsx`)
- **No testing framework** currently set up

## Dev Commands
```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Project Structure
```
app/
  layout.tsx          # Root layout — metadata, OG tags, schema.org JSON-LD, Navbar+Footer
  page.tsx            # Home page (assembles section components)
  globals.css / extra.css
  compare/            # Compare page
  compliance/         # DPDP compliance page
  contact/            # Contact page
  features/           # Features page
  how-it-works/       # How it works page
  pricing/            # Pricing page
  privacy/            # Privacy policy
  terms/              # Terms of service
  delete-request/     # Data deletion request form
  robots.ts / sitemap.ts

components/
  Navbar.tsx
  Footer.tsx
  ScrollReveal.tsx    # Intersection Observer scroll animations
  FeatureModal.tsx    # Feature detail modal
  ChatWidget.tsx
  DeletionForm.tsx
  sections/
    Hero.tsx
    Features.tsx
    Pricing.tsx
    Workflow.tsx
    Compare.tsx
    Compliance.tsx
    Contact.tsx
```

## Key Conventions
- App Router pages: each route folder has a single `page.tsx`
- Section components live in `components/sections/`
- `SITE_URL = "https://kauntech.com"` is defined in `app/layout.tsx` — use this constant for any absolute URLs
- Schema.org JSON-LD is injected inline in the `<head>` via `layout.tsx`
- No environment variables currently in use on the frontend

## SEO / Metadata
- Metadata defined per-page using Next.js `export const metadata`
- Canonical URLs, OG tags, Twitter cards set in root layout
- `sitemap.ts` and `robots.ts` generate XML/txt dynamically

## RAG Chatbot (in-app, server-side)
The site chatbot ([components/ChatWidget.tsx](components/ChatWidget.tsx)) is a real
retrieval-augmented assistant, ported from the `rag-chatbot-kauntech/` scaffold into
Next.js (no separate Python service). Flow: widget → `POST /api/chat` → embed query
(Gemini) → `match_documents` pgvector RPC (Supabase) → Gemini grounded reply →
best-effort conversation logging + `after()` analytics.
- Engine lives in [lib/rag/](lib/rag/): `config`, `supabase`, `gemini`, `prompts`,
  `retriever`, `db`, `ingest`, `analytics`, `chat`, and `data/knowledge-base.ts`.
- Schema: [supabase/migrations/](supabase/migrations/) (`0001_init` → `0002_rls` →
  `0003_hardening` → `0004_contact` → `0005_blog`).
  pgvector 768-dim; RLS on with no policies (anon key gets zero access).
- Knowledge base: [lib/rag/data/knowledge-base.ts](lib/rag/data/knowledge-base.ts) —
  edit then re-seed via `POST /api/ingest {"seed":true}` with `X-Admin-Key`.
- `POST /api/ingest {"documents":[...]}` (admin-gated) lets n8n push new docs (e.g. blog
  posts as `doc_type:"blog"`) without redeploying.
- Env (server-only, set in Vercel): `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`,
  `GOOGLE_API_KEY`, `ADMIN_API_KEY`. See `.env.local.example`. Setup steps: `RAG_SETUP.md`.
- **Model rule:** the active Gemini key is new-generation — `gemini-2.0-flash` and
  `text-embedding-004` are NOT available (404). Use `gemini-2.5-flash` (generation,
  thinking disabled) + `gemini-embedding-001` @ 768 dims. Don't revert to the older models.

## Blog (n8n → Supabase → site, display-only)
The site **never authors** posts — n8n creates them and POSTs to the site, which only
**renders** them. Full pipeline guide: [BLOG_PIPELINE.md](BLOG_PIPELINE.md).
- Schema: `blog_posts` ([supabase/migrations/0005_blog.sql](supabase/migrations/0005_blog.sql)).
  RLS on, no policies → server reads via service-role (same posture as the rest).
- Media: public Supabase Storage bucket `blog-media` (100 MB/file). Photos via
  `cover_image` / inline Markdown / `media[]`; videos via `media[]` as `type:"video"`
  (self-hosted mp4/webm) or `type:"embed"` (YouTube/Vimeo, best for long video).
- Engine: [lib/blog/](lib/blog/) (`types`, `db`, `util`). Pages: [app/blog/](app/blog/)
  (`page.tsx` index, `[slug]/page.tsx` article) — server components, ISR `revalidate=300`.
  Markdown rendered by [components/Markdown.tsx](components/Markdown.tsx) (react-markdown +
  remark-gfm, no raw HTML); media by [components/BlogMedia.tsx](components/BlogMedia.tsx).
- Write path: `POST /api/blog` ([app/api/blog/route.ts](app/api/blog/route.ts)), admin-gated
  by `X-Admin-Key`. Upserts by `slug` AND (when `status:"published"`) embeds the post into
  the RAG store (`doc_type:"blog"`), so the chatbot can cite it. `DELETE /api/blog?slug=`
  removes both. Admin auth shared via [lib/admin-auth.ts](lib/admin-auth.ts).

## Careers + AI HRM (site intake → Supabase → admin HR)
Public hiring + AI candidate screening. Full guide: [CAREERS_HRM.md](CAREERS_HRM.md).
- Schema: [supabase/migrations/0008_careers.sql](supabase/migrations/0008_careers.sql) —
  `job_openings`, `job_applications` (incl. `embedding vector(768)`), the
  `match_candidates` pgvector RPC, and a **private** `resumes` Storage bucket.
  RLS on, no policies (service-role only); same posture as the rest.
- **Site (public):** `/career` ([app/career/](app/career/)) lists open roles +
  [components/CareerForm.tsx](components/CareerForm.tsx) collects an application +
  resume (PDF/DOCX, consent required). `POST /api/careers/apply` stores the file in
  the private bucket + inserts the row, then `after()` parses it. Engine:
  [lib/careers/](lib/careers/) (`parse.ts` = Gemini multimodal for PDF / `mammoth`
  for DOCX → structured JSON + embedding). `POST /api/careers/parse` (admin-gated)
  re-runs parsing.
- **Admin (kauntech-admin):** HR suite under `/careers` — applicant inbox, candidate
  detail (resume via signed URL, pipeline status/rating/notes, fit analysis, screening
  questions), job-openings CRUD, **AI shortlist** (`/careers/jobs/[id]/shortlist`), and
  a **resume chatbot** (`/careers/chat`). AI in `lib/hr-ai.ts` (recall via
  `match_candidates` + staged Gemini scoring); its own Gemini client (`lib/ai.ts`) uses
  the SAME `GOOGLE_API_KEY`. Job writes go direct via service-role (no RAG sync).
- **Privacy (DPDP):** resumes are PRIVATE (signed-URL only), consent-gated, and resume
  embeddings live ONLY in `job_applications` — they are NEVER ingested into the public
  `documents` RAG store, so the site chatbot can't leak applicant data.

## Abuse protection / rate limiting (public POST endpoints)
Durable, per-IP rate limiting on the three public endpoints, backed by Postgres so
counts hold across serverless instances. Schema:
[supabase/migrations/0011_rate_limits.sql](supabase/migrations/0011_rate_limits.sql)
(`rate_limit_counters` + atomic `rl_hit(key, limit, window)` RPC; RLS on, service-role
only, opportunistic self-cleanup). Engine: [lib/rate-limit.ts](lib/rate-limit.ts)
(`getClientIp` from `x-forwarded-for`, `istDay` for IST-midnight daily resets, `rlHit`
fails OPEN on store error, tunable `LIMITS`).
- **`/api/chat`** (the Gemini-cost path) has 3 layers: burst (anti-flood per IP) →
  per-visitor **daily question quota** (returns a "contact support / try tomorrow" 429) →
  **global daily ceiling** (503 circuit-breaker capping total Gemini calls/day).
- **`/api/contact`** + **`/api/careers/apply`**: per-IP burst + daily caps (apply also
  throttles the background resume parse + upload). Honeypot still runs first.
- Clients surface the server `detail` to the user: [ChatWidget.tsx](components/ChatWidget.tsx),
  [Contact.tsx](components/sections/Contact.tsx), [CareerForm.tsx](components/CareerForm.tsx).
- Admin-gated writes (`/api/ingest|blog|revalidate|careers/parse`) are NOT rate-limited —
  they're protected by `X-Admin-Key` ([lib/admin-auth.ts](lib/admin-auth.ts)).
- **Security headers:** [next.config.ts](next.config.ts) `headers()` sets CSP, HSTS,
  X-Frame-Options, Referrer-Policy, Permissions-Policy on all routes. CSP allows cdnjs
  (Font Awesome), the public Supabase origin (blog media), and YouTube/Vimeo embeds;
  `script/style-src` keep `'unsafe-inline'` (App Router inline bootstrap + JSON-LD; no
  nonce yet — a future upgrade). `'unsafe-eval'` is dev-only.
- **Chatbot response cache:** [lib/rag/cache.ts](lib/rag/cache.ts) + `chat_cache` table
  ([0013](supabase/migrations/0013_chat_cache.sql)). `handleChat` checks a sha256 of the
  normalized question and, on a hit, returns the stored reply WITHOUT any Gemini call
  (still logs the transcript). Cleared wholesale on every `ingest()` so answers can't go
  stale. Big saver for the widget's preset chips.

## Data deletion portal (DPDP Right-to-Erasure — for APP users)
The `/delete-request` page is the erasure mechanism for **Kauntech APP** users (and what
Google checks for OAuth verification). [components/DeletionForm.tsx](components/DeletionForm.tsx)
POSTs to `POST /api/delete-request` ([route](app/api/delete-request/route.ts)), which
honeypots + rate-limits + validates, then stores the request in `data_deletion_requests`
([0012](supabase/migrations/0012_deletion_requests.sql), RLS on/service-role only) and
returns a real `KNT-DEL-XXXXXXXX` ticket. **The team actions the actual erasure against the
app backend** — this site only captures the request. (Previously the form was a no-op that
faked a ticket and stored nothing.) Engine: [lib/deletion.ts](lib/deletion.ts).
  *Follow-up: wire an email/Slack notification + a review view in kauntech-admin.*

## Business Context
- Product: Kauntech Android/iOS app (business card scanner)
- Company: Kauntech Technologies Pvt. Ltd.
- Support email: business@voltairtech.com
- Plans: Free, Pro (₹499/mo), Enterprise (₹999/mo)
- Compliance: India DPDP Act 2023 is a key differentiator — handle carefully
