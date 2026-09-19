-- =========================================================
-- 020_security_log.sql — Security events log
-- =========================================================

create table if not exists public.security_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null, -- LOGIN_FAILED | PERMISSION_DENIED | RATE_LIMIT | SUSPICIOUS_ACTIVITY
  severity text not null default 'INFO', -- INFO | WARNING | CRITICAL
  actor_user_id uuid,
  ip_address text,
  user_agent text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_events_type_idx on public.security_events (event_type, created_at desc);
create index if not exists security_events_severity_idx on public.security_events (severity, created_at desc);

alter table public.security_events enable row level security;

drop policy if exists "security_events_read" on public.security_events;
create policy "security_events_read" on public.security_events
  for select using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name in ('system_admin')
    )
  );

drop policy if exists "security_events_insert" on public.security_events;
create policy "security_events_insert" on public.security_events
  for insert with check (auth.uid() is not null);