-- =========================================================
-- 001_init.sql — Phase 1 Foundation
-- =========================================================

-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- =========================================================
-- ORGANISATION
-- =========================================================
create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique not null,
  parent_id uuid references public.organisations(id),
  type text not null default 'unit', -- 'root' | 'unit' | 'department' | 'location'
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- =========================================================
-- PROFILES (mirror auth.users)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  organisation_id uuid references public.organisations(id),
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- ROLES & PERMISSIONS
-- =========================================================
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  display_name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid,
  primary key (user_id, role_id)
);

-- =========================================================
-- AUDIT LOGS
-- =========================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null default gen_random_uuid(),
  timestamp timestamptz not null default now(),
  actor_user_id uuid,
  actor_role text,
  action text not null,
  module text not null,
  resource_type text,
  resource_id text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  result text not null default 'SUCCESS',
  session_id text,
  request_id text,
  ip_context text
);

create index if not exists audit_logs_timestamp_idx on public.audit_logs (timestamp desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_user_id);

-- =========================================================
-- TRIGGER: auto-create profile on new auth user
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================
-- HELPER: current user's permissions
-- =========================================================
create or replace function public.current_user_permissions()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(array_agg(distinct p.code), '{}'::text[])
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.permissions p on p.id = rp.permission_id
  where ur.user_id = auth.uid();
$$;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.organisations enable row level security;
alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles: user can read own, admin can read all
create policy "profiles_select_self" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_admin_all" on public.profiles
  for all using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'system_admin'
    )
  );

-- Roles/permissions readable by authenticated
create policy "roles_read" on public.roles
  for select using (auth.uid() is not null);

create policy "permissions_read" on public.permissions
  for select using (auth.uid() is not null);

create policy "role_permissions_read" on public.role_permissions
  for select using (auth.uid() is not null);

create policy "user_roles_read_self" on public.user_roles
  for select using (user_id = auth.uid());

-- Organisations readable by authenticated
create policy "orgs_read" on public.organisations
  for select using (auth.uid() is not null);

-- Audit logs: only admin
create policy "audit_admin_read" on public.audit_logs
  for select using (
    exists (
      select 1 from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name in ('system_admin')
    )
  );