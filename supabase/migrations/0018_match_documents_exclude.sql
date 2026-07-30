-- =====================================================================
-- Migration 0018: let match_documents exclude doc_types
--
-- Why: retrieval takes a small top-K (6). The blog grows daily while the
-- marketing KB is a fixed ~23 documents, so without a guard the blog would
-- eventually own every slot and questions like "what does Pro cost" would be
-- answered from articles instead of the `plan` documents.
--
-- The fix (lib/rag/retriever.ts) issues two bounded queries per question -
-- "best blog matches" and "best NON-blog matches" - and merges them so the KB
-- always keeps most of the slots. That second query needs a way to say "any
-- type except blog", which the old signature couldn't express.
--
-- filter_type (include one type) is kept as-is; exclude_types is additive and
-- defaults to null, so existing calls behave exactly as before.
--
-- Note: this REPLACES the 4-arg function rather than overloading it - two
-- overloads sharing a name make PostgREST's argument resolution ambiguous.
-- The site is the only caller (lib/rag/db.ts).
-- =====================================================================

drop function if exists match_documents(vector, int, text, float);

create or replace function match_documents(
    query_embedding vector(768),
    match_count     int     default 6,
    filter_type     text    default null,
    min_similarity  float   default 0.0,
    exclude_types   text[]  default null   -- doc_types to leave out
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
      and (exclude_types is null or not (d.doc_type = any(exclude_types)))
      and (1 - (d.embedding <=> query_embedding)) >= min_similarity
    order by d.embedding <=> query_embedding
    limit match_count;
$$;

-- Re-apply the 0003 hardening: the drop above took the pinned search_path
-- with it, and an unpinned function trips the Supabase advisor.
alter function match_documents(vector, int, text, float, text[])
    set search_path = public, pg_temp;
