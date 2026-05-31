-- =====================================================================
-- Migration 0004: contact form submissions
--
-- Backs the /contact form (components/sections/Contact.tsx -> POST /api/contact).
-- The server inserts with the service-role key; RLS is enabled with no policies
-- so the anon/public key gets zero access (same posture as the RAG tables).
-- =====================================================================

create table if not exists contact_submissions (
    id          bigint generated always as identity primary key,
    name        text        not null,
    company     text,
    phone       text,
    email       text        not null,
    message     text        not null,
    page_url    text,
    user_agent  text,
    -- new | handled | spam — lets you triage in the dashboard / via n8n.
    status      text        not null default 'new',
    metadata    jsonb       not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);

create index if not exists contact_submissions_created_idx
    on contact_submissions (created_at desc);
create index if not exists contact_submissions_status_idx
    on contact_submissions (status);

alter table contact_submissions enable row level security;
-- No policies → anon/authenticated get zero access; service_role bypasses RLS.
