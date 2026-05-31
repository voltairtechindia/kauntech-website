-- =====================================================================
-- RAG Starter — core schema (RAG + conversation logging + analytics)
--
-- Run this in the Supabase SQL editor, or via the Supabase CLI:
--   supabase db push
--
-- Embedding dimension is 768. If you swap the embedding model, change
-- vector(768) everywhere below and re-run ingestion (EMBEDDING_DIM must match).
-- =====================================================================

-- --- Extensions --------------------------------------------------------
create extension if not exists vector;
create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- =====================================================================
-- RAG knowledge base
-- =====================================================================
-- A single table holds every kind of knowledge (products, FAQs, locations,
-- and any custom doc_types you add). `doc_type` lets the retriever filter by
-- category; `metadata` keeps the original structured fields so the API can
-- render rich product/location cards.
create table if not exists documents (
    id          bigint generated always as identity primary key,
    doc_type    text        not null,            -- product | faq | location | <your own>
    external_id text,                            -- stable id from source data
    title       text,
    content     text        not null,            -- text that gets embedded
    metadata    jsonb       not null default '{}'::jsonb,
    embedding   vector(768),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    -- Non-partial unique constraint so it can act as the ON CONFLICT arbiter
    -- for the ingestion upsert (PostgREST upsert can't target a partial index).
    constraint documents_type_external_key unique (doc_type, external_id)
);

create index if not exists documents_doc_type_idx on documents (doc_type);

-- Approximate-nearest-neighbour index for cosine similarity.
create index if not exists documents_embedding_idx
    on documents using hnsw (embedding vector_cosine_ops);

-- =====================================================================
-- Conversation logging (one row per chat session = latest snapshot)
-- =====================================================================
-- These analytics columns are generic. Tailor them to what the client wants
-- to learn (and keep app/services/analytics.py + prompts.py in sync).
create table if not exists conversations (
    id                 uuid        primary key default gen_random_uuid(),
    session_id         text        not null,        -- generated client-side, stable per browser session
    location           text,                          -- user's city/area, if known
    topics             text[]      not null default '{}',   -- interests/needs mentioned
    mentioned_products text[]      not null default '{}',   -- products discussed/recommended
    asked_for_location boolean     not null default false,  -- buy/visit intent
    intent             text,
    sentiment          text,                          -- positive | neutral | negative
    lead_score         int         not null default 0,
    metadata           jsonb       not null default '{}'::jsonb,
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);

create index if not exists conversations_session_idx  on conversations (session_id);
create index if not exists conversations_location_idx on conversations (location);
create index if not exists conversations_created_idx  on conversations (created_at desc);

-- =====================================================================
-- Messages (full transcript)
-- =====================================================================
create table if not exists messages (
    id              bigint generated always as identity primary key,
    conversation_id uuid        not null references conversations (id) on delete cascade,
    role            text        not null check (role in ('user', 'assistant', 'system')),
    content         text        not null,
    -- retrieval debug / card payload returned to the widget
    metadata        jsonb       not null default '{}'::jsonb,
    created_at      timestamptz not null default now()
);

create index if not exists messages_conversation_idx on messages (conversation_id, created_at);

-- =====================================================================
-- Insights (append-only analytics events, one per analysed turn)
-- =====================================================================
-- `conversations` always holds the latest snapshot; `conversation_insights`
-- keeps the history so you can see how a lead evolved over time.
create table if not exists conversation_insights (
    id                 bigint generated always as identity primary key,
    conversation_id    uuid        not null references conversations (id) on delete cascade,
    location           text,
    topics             text[]      not null default '{}',
    mentioned_products text[]      not null default '{}',
    asked_for_location boolean     not null default false,
    intent             text,
    sentiment          text,
    raw                jsonb       not null default '{}'::jsonb,
    created_at         timestamptz not null default now()
);

create index if not exists insights_conversation_idx on conversation_insights (conversation_id);
create index if not exists insights_location_idx     on conversation_insights (location);

-- =====================================================================
-- Helpers
-- =====================================================================

-- keep updated_at fresh
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_documents_updated_at on documents;
create trigger trg_documents_updated_at
    before update on documents
    for each row execute function set_updated_at();

drop trigger if exists trg_conversations_updated_at on conversations;
create trigger trg_conversations_updated_at
    before update on conversations
    for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- match_documents: cosine-similarity retrieval for RAG.
--   query_embedding : the embedded user query
--   match_count     : how many rows to return
--   filter_type     : optional doc_type filter (null = all types)
--   min_similarity  : drop weak matches (0..1)
-- Returns rows ordered by similarity (1 - cosine distance).
-- ---------------------------------------------------------------------
create or replace function match_documents(
    query_embedding vector(768),
    match_count     int     default 6,
    filter_type     text    default null,
    min_similarity  float   default 0.0
)
returns table (
    id          bigint,
    doc_type    text,
    external_id text,
    title       text,
    content     text,
    metadata    jsonb,
    similarity  float
)
language sql stable
as $$
    select
        d.id,
        d.doc_type,
        d.external_id,
        d.title,
        d.content,
        d.metadata,
        1 - (d.embedding <=> query_embedding) as similarity
    from documents d
    where d.embedding is not null
      and (filter_type is null or d.doc_type = filter_type)
      and (1 - (d.embedding <=> query_embedding)) >= min_similarity
    order by d.embedding <=> query_embedding
    limit match_count;
$$;

-- ---------------------------------------------------------------------
-- Aggregated analytics view: quick location breakdowns.
-- ---------------------------------------------------------------------
create or replace view analytics_location_rollup as
select
    coalesce(location, 'unknown')                 as location,
    count(*)                                       as conversations,
    count(*) filter (where asked_for_location)     as location_requests,
    round(avg(lead_score)::numeric, 1)             as avg_lead_score
from conversations
group by coalesce(location, 'unknown')
order by conversations desc;
