-- =====================================================================
-- Migration 0013: chatbot response cache
--
-- Skips BOTH the Gemini embedding + generation calls when the SAME question
-- (normalized) is asked again — e.g. the widget's preset chips, which get
-- clicked constantly. Keyed on a hash of the normalized question text; only
-- standalone/identical repeats hit it, so context-dependent follow-ups (which
-- aren't byte-identical anyway) never collide.
--
-- Invalidated wholesale whenever the knowledge base is re-ingested (see
-- lib/rag/ingest.ts). Same posture: RLS on, no policies, service-role only.
-- =====================================================================

create table if not exists chat_cache (
    q_hash      text        primary key,  -- sha256 of normalized question
    question    text        not null,     -- the normalized question (for debugging)
    reply       text        not null,
    sources     jsonb       not null default '[]'::jsonb,
    hits        integer     not null default 0,
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null
);

create index if not exists chat_cache_expires_idx on chat_cache (expires_at);
create index if not exists chat_cache_hits_idx on chat_cache (hits desc);

alter table chat_cache enable row level security;
-- No policies → anon/authenticated get zero access; service_role bypasses RLS.

-- Atomic hit-counter bump (best-effort; called on a cache hit).
create or replace function public.chat_cache_bump(p_hash text)
returns void
language sql
as $$
  update chat_cache set hits = hits + 1 where q_hash = p_hash;
$$;

revoke all on function public.chat_cache_bump(text)
  from public, anon, authenticated;
grant execute on function public.chat_cache_bump(text) to service_role;
