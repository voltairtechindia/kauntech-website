# Careers + AI HRM pipeline

How hiring works across the two apps: the **site** (`kauntech-site`) collects
applications on `/career`; the **admin** (`kauntech-admin`) is where HR reviews
candidates and runs the AI screening. Both share the one Supabase project
(`ujzchcirgmveryjavfzk`) and the **same** Gemini key (`GOOGLE_API_KEY`).

```
Candidate ──▶ /career (site) ──▶ POST /api/careers/apply
                                   │  • upload resume → PRIVATE `resumes` bucket
                                   │  • insert job_applications row (parse_status=pending)
                                   │  • after(): Gemini parse → structured JSON + embedding
                                   ▼
                            Supabase (job_openings, job_applications)
                                   ▲
HR ──▶ admin /careers ─────────────┘  reads applicants, runs AI:
        • AI shortlist  (match_candidates recall + Gemini scoring)
        • fit analysis / screening questions (per candidate)
        • resume chatbot (grounded in the candidate pool only)
        • job openings CRUD (writes job_openings directly, service-role)
```

## Data model (migration 0008)
- **`job_openings`** — postings shown on `/career`. Managed in the admin. Fields:
  `title, slug, department, location, employment_type, experience_level,
  description_md, responsibilities[], requirements[], skills[], salary_range,
  positions, status (open|closed|draft)`. Only `status='open'` shows on the site.
- **`job_applications`** — one row per submission. Applicant fields + `resume_path`
  (object in the private bucket) + AI enrichment (`parse_status`, `resume_text`,
  `parsed` jsonb, `embedding vector(768)`) + HR workflow (`status, ai_score, rating,
  notes`).
- **`match_candidates(query_embedding, match_count, filter_job, min_similarity)`** —
  pgvector recall over applicants (only parsed rows with an embedding). Mirrors the
  RAG store's `match_documents`.
- **`resumes` Storage bucket** — **private** (10 MB cap, PDF + DOCX only). No public
  policy: HR opens resumes via short-lived **signed URLs**.

## Resume parsing
On apply (and on the admin's "Re-run AI parse" button → `POST /api/careers/parse`):
1. Download the resume bytes (service-role).
2. **PDF** → Gemini multimodal reads the document natively (columns/tables/layout);
   **DOCX** → `mammoth` extracts text → Gemini structures it.
3. Returns `{ plain_text, full_name, email, phone, current_title,
   total_experience_years, skills[], education[], summary }`.
4. Embed (document mode, `gemini-embedding-001` @ 768) → `job_applications.embedding`.

Parsing runs in the background (`after()`), so a slow/failed Gemini call never blocks
or breaks the candidate's submission — failures set `parse_status='error'` and can be
retried from the admin.

## AI screening (admin)
- **AI shortlist** (`/careers/jobs/[id]/shortlist`): embeds the role's
  requirements/skills → `match_candidates` → scores each candidate with Gemini
  (skill-presence → evidence/proficiency → 0–100), ranked with matched/missing skills
  and a verdict. Scope: applicants to this role, or the whole pool.
- **Fit analysis / screening questions** (candidate page): per-candidate, against any
  selected role.
- **Resume chatbot** (`/careers/chat`): retrieves the most relevant candidates and
  answers grounded **only** in their resume data — it can compare/rank/count but will
  not invent candidates or skills.

## Privacy (DPDP)
- Resumes are **private** — only ever surfaced via signed URLs; never a public bucket.
- The form requires explicit **consent** (+ a honeypot, + server-side validation).
- Resume embeddings live **only** in `job_applications` and are queried **only** by the
  admin. They are **never** ingested into the public `documents` RAG store, so the
  site's visitor chatbot cannot surface applicant data.
- Deleting an applicant from the admin also removes their resume object.

## Setup checklist
1. Apply migration `0008_careers.sql` (done on the shared project).
2. Site env: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GOOGLE_API_KEY`, `ADMIN_API_KEY`
   (all already set for the chatbot/blog — no new vars).
3. Admin env: add `GOOGLE_API_KEY` (same value as the site); `SUPABASE_*`,
   `KAUNTECH_API_URL`, `KAUNTECH_ADMIN_KEY` already exist.
4. Create your first opening in the admin (`/careers/jobs/new`) — it goes live on
   `/career` when `status='open'`.
