-- =====================================================================
-- Migration 0012: DPDP data-deletion requests
--
-- Backs the /delete-request portal (components/DeletionForm.tsx ->
-- POST /api/delete-request). This is the Right-to-Erasure / Google OAuth data
-- deletion mechanism for KAUNTECH APP users — the team actions each request
-- against the app's backend, so requests must be durably captured (previously
-- the form was a no-op that fabricated a ticket and stored nothing).
--
-- Same posture as contact_submissions: server inserts with the service-role
-- key; RLS on with no policies so anon/public get zero access.
-- =====================================================================

create table if not exists data_deletion_requests (
    id          bigint generated always as identity primary key,
    ticket      text        not null unique,
    full_name   text        not null,
    email       text        not null,
    scope       text        not null,  -- all | oauth | local | support
    details     text,
    consent     boolean     not null default false,
    page_url    text,
    user_agent  text,
    ip          text,
    -- new | in_progress | completed | rejected — triage in dashboard / n8n.
    status      text        not null default 'new',
    metadata    jsonb       not null default '{}'::jsonb,
    created_at  timestamptz not null default now()
);

create index if not exists data_deletion_requests_created_idx
    on data_deletion_requests (created_at desc);
create index if not exists data_deletion_requests_status_idx
    on data_deletion_requests (status);
create index if not exists data_deletion_requests_email_idx
    on data_deletion_requests (email);

alter table data_deletion_requests enable row level security;
-- No policies → anon/authenticated get zero access; service_role bypasses RLS.
