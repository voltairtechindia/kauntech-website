-- =====================================================================
-- Migration 0002: Row Level Security
--
-- The FastAPI backend connects with the Supabase *service role* key,
-- which bypasses RLS. Enabling RLS with no public policies means the
-- anon/public key (e.g. if it ever leaks to the browser) cannot read or
-- write any of these tables. The widget never talks to Supabase
-- directly — it only talks to our backend — so this is safe.
-- =====================================================================

alter table documents              enable row level security;
alter table conversations          enable row level security;
alter table messages               enable row level security;
alter table conversation_insights  enable row level security;

-- No policies are created for the anon/authenticated roles, so those
-- roles get zero access. The service_role bypasses RLS entirely.

-- If you later want a read-only analytics dashboard authenticated with a
-- normal Supabase user, add a policy such as:
--
--   create policy "analytics read" on conversations
--     for select to authenticated using (true);
