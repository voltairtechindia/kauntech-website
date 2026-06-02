-- 0011_rate_limits.sql
-- IP / quota rate limiting for the public endpoints (/api/chat, /api/contact,
-- /api/careers/apply). One atomic upsert per check via rl_hit().
--
-- Same security posture as the rest of the schema: RLS ON, no policies, so the
-- anon key gets ZERO access; only the server's service-role client can read or
-- write counters or call the function.

create table if not exists public.rate_limit_counters (
  key         text primary key,
  count       integer not null default 0,
  expires_at  timestamptz not null,
  updated_at  timestamptz not null default now()
);

create index if not exists rate_limit_counters_expires_idx
  on public.rate_limit_counters (expires_at);

alter table public.rate_limit_counters enable row level security;

-- Atomic fixed-window counter.
--   p_key            unique bucket (e.g. "chat:day:2026-06-02:1.2.3.4")
--   p_limit          max hits allowed in the window
--   p_window_seconds window length
-- Returns whether THIS hit is allowed, how many remain, and when the window
-- resets. A fresh window (count -> 1) starts once the previous one expired.
create or replace function public.rl_hit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, reset_at timestamptz)
language plpgsql
as $$
declare
  v_count   integer;
  v_expires timestamptz;
begin
  insert into public.rate_limit_counters as r (key, count, expires_at, updated_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds), now())
  on conflict (key) do update
    set count = case when r.expires_at <= now() then 1 else r.count + 1 end,
        expires_at = case when r.expires_at <= now()
                          then now() + make_interval(secs => p_window_seconds)
                          else r.expires_at end,
        updated_at = now()
  returning r.count, r.expires_at into v_count, v_expires;

  -- Opportunistic cleanup (~1% of calls) so expired buckets don't accumulate.
  if random() < 0.01 then
    delete from public.rate_limit_counters
    where expires_at < now() - interval '1 hour';
  end if;

  return query
    select (v_count <= p_limit),
           greatest(p_limit - v_count, 0),
           v_expires;
end;
$$;

revoke all on function public.rl_hit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.rl_hit(text, integer, integer) to service_role;
