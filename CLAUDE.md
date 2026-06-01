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

## Business Context
- Product: Kauntech Android/iOS app (business card scanner)
- Company: Kauntech Technologies Pvt. Ltd.
- Support email: business@voltairtech.com
- Plans: Free, Pro (₹499/mo), Enterprise (₹999/mo)
- Compliance: India DPDP Act 2023 is a key differentiator — handle carefully
