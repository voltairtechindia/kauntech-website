-- =====================================================================
-- Migration 0014: pin search_path on the functions added in 0011/0013
--
-- Addresses the `function_search_path_mutable` advisor. These functions run as
-- service_role only and are not SECURITY DEFINER, so risk is low — but a fixed,
-- empty search_path (with fully-qualified identifiers) is cheap defense in depth
-- against search_path manipulation.
-- =====================================================================

-- rl_hit already fully-qualifies its table refs; just pin the path.
alter function public.rl_hit(text, integer, integer) set search_path = '';

-- chat_cache_bump referenced `chat_cache` unqualified — qualify it + pin path.
create or replace function public.chat_cache_bump(p_hash text)
returns void
language sql
set search_path = ''
as $$
  update public.chat_cache set hits = hits + 1 where q_hash = p_hash;
$$;
