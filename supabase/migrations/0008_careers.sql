-- =====================================================================
-- Migration 0008: Careers + AI HRM
--
-- Backs the public /career page (kauntech-site) and the HR features in the
-- admin panel (kauntech-admin):
--   * job_openings      — HR-managed postings shown on /career
--   * job_applications  — candidate submissions + resume + AI enrichment
--   * match_candidates  — pgvector recall over applications (admin AI shortlist)
--   * resumes bucket    — PRIVATE Storage for uploaded resumes (PII / DPDP)
--
-- Security posture matches the rest of the project: RLS is ON with NO policies,
-- so the anon/public key gets ZERO access. The Next.js servers read + write with
-- the service-role key (which bypasses RLS).
--
-- IMPORTANT (privacy): the `resumes` bucket is NOT public (unlike `blog-media`).
-- HR views resumes only via short-lived signed URLs. Candidate embeddings live
-- ONLY in job_applications and are queried ONLY by the admin — they are never
-- ingested into the public `documents` RAG store, so the site chatbot can't leak
-- applicant data.
-- =====================================================================

create extension if not exists vector;
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- =====================================================================
-- job_openings — postings powering /career, managed from the admin panel
-- =====================================================================
create table if not exists job_openings (
    id              uuid        primary key default gen_random_uuid(),
    slug            text        not null unique,          -- URL: /career/<slug>
    title           text        not null,
    department      text,
    location        text,                                  -- "Remote", "Bengaluru", …
    employment_type text,                                  -- full-time | part-time | contract | internship
    experience_level text,                                 -- "2-4 years", "Senior", …
    description_md  text        not null default '',       -- role description (Markdown)
    responsibilities text[]     not null default '{}',
    requirements    text[]      not null default '{}',     -- must-haves / qualifications
    skills          text[]      not null default '{}',     -- key skills (used for AI matching)
    salary_range    text,
    positions       int         not null default 1,
    status          text        not null default 'open'
                                check (status in ('open', 'closed', 'draft')),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists job_openings_status_idx on job_openings (status);
create index if not exists job_openings_slug_idx   on job_openings (slug);

-- reuse the set_updated_at() helper from 0001_init.sql
drop trigger if exists trg_job_openings_updated_at on job_openings;
create trigger trg_job_openings_updated_at
    before update on job_openings
    for each row execute function set_updated_at();

alter table job_openings enable row level security;

-- =====================================================================
-- job_applications — candidate submissions from /career
-- =====================================================================
create table if not exists job_applications (
    id               uuid       primary key default gen_random_uuid(),
    job_id           uuid       references job_openings (id) on delete set null,
    job_title        text,                                 -- snapshot of the role applied for
    -- Applicant-provided fields
    full_name        text       not null,
    email            text       not null,
    phone            text,
    location         text,
    linkedin_url     text,
    portfolio_url    text,
    years_experience numeric,                              -- self-reported
    cover_note       text,
    -- Resume (stored in the PRIVATE `resumes` bucket)
    resume_path      text       not null,                  -- object path within the bucket
    resume_filename  text,
    resume_mime      text,
    -- AI enrichment (filled asynchronously after upload)
    parse_status     text       not null default 'pending'
                                check (parse_status in ('pending', 'done', 'error')),
    resume_text      text,                                 -- extracted plain text
    parsed           jsonb      not null default '{}'::jsonb, -- { skills[], total_experience_years, current_title, education[], summary, … }
    embedding        vector(768),
    -- HR workflow
    status           text       not null default 'new'
                                check (status in ('new', 'reviewing', 'shortlisted', 'interview', 'rejected', 'hired')),
    ai_score         int,                                  -- last computed fit score (cache)
    rating           int,                                  -- HR manual 1–5
    notes            text,                                 -- HR private notes
    metadata         jsonb      not null default '{}'::jsonb,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);

create index if not exists job_applications_job_idx     on job_applications (job_id);
create index if not exists job_applications_status_idx  on job_applications (status);
create index if not exists job_applications_email_idx   on job_applications (email);
create index if not exists job_applications_created_idx on job_applications (created_at desc);

-- Approximate-nearest-neighbour index for cosine similarity (resume matching).
create index if not exists job_applications_embedding_idx
    on job_applications using hnsw (embedding vector_cosine_ops);

drop trigger if exists trg_job_applications_updated_at on job_applications;
create trigger trg_job_applications_updated_at
    before update on job_applications
    for each row execute function set_updated_at();

alter table job_applications enable row level security;

-- ---------------------------------------------------------------------
-- match_candidates: cosine-similarity recall over applicants (admin AI).
--   query_embedding : the embedded role requirements / HR question
--   match_count     : how many rows to return
--   filter_job      : optional job_id filter (null = whole pool)
--   min_similarity  : drop weak matches (0..1)
-- Only returns parsed candidates with an embedding. Mirrors match_documents.
-- ---------------------------------------------------------------------
create or replace function match_candidates(
    query_embedding vector(768),
    match_count     int     default 10,
    filter_job      uuid    default null,
    min_similarity  float   default 0.0
)
returns table (
    id          uuid,
    job_id      uuid,
    job_title   text,
    full_name   text,
    email       text,
    parsed      jsonb,
    resume_text text,
    status      text,
    ai_score    int,
    similarity  float
)
language sql stable
as $$
    select
        a.id,
        a.job_id,
        a.job_title,
        a.full_name,
        a.email,
        a.parsed,
        a.resume_text,
        a.status,
        a.ai_score,
        1 - (a.embedding <=> query_embedding) as similarity
    from job_applications a
    where a.embedding is not null
      and a.parse_status = 'done'
      and (filter_job is null or a.job_id = filter_job)
      and (1 - (a.embedding <=> query_embedding)) >= min_similarity
    order by a.embedding <=> query_embedding
    limit match_count;
$$;

-- =====================================================================
-- Storage: PRIVATE bucket for uploaded resumes
-- =====================================================================
-- 10 MB per-file cap. NOT public — there is intentionally NO public read policy.
-- All access is via the service-role key (uploads) + short-lived signed URLs
-- (HR downloads in the admin panel).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'resumes',
    'resumes',
    false,
    10485760,
    array[
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
on conflict (id) do update
    set public             = excluded.public,
        file_size_limit    = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
