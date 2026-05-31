-- =====================================================================
-- Migration 0003: security hardening (clears Supabase advisor findings)
--
-- Addresses the linter warnings raised after 0001/0002:
--   * function_search_path_mutable — pin search_path so the functions can't
--     be hijacked by a caller-controlled search_path.
--   * security_definer_view — run the analytics view with the querying
--     role's permissions (and RLS), not the view owner's.
--
-- The rls_enabled_no_policy INFO notices are intentional and NOT addressed
-- here: RLS is on with no policies on purpose, so the anon/public key gets
-- zero access while the server's service_role key bypasses RLS. See 0002.
-- =====================================================================

-- 1. Pin search_path on helper + retrieval functions.
alter function set_updated_at() set search_path = public, pg_temp;
alter function match_documents(vector, int, text, float)
    set search_path = public, pg_temp;

-- 2. Analytics view honours the caller's RLS instead of the definer's.
alter view analytics_location_rollup set (security_invoker = on);
