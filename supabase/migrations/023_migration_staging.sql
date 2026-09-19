-- =========================================================
-- 023_migration_staging.sql — Legacy data migration
-- =========================================================

-- ============================================================
-- MIGRATION BATCHES
-- 1 upload = 1 batch
-- ============================================================
create table if not exists public.migration_batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  entity_type text not null,
  -- customers | sites | products | vendors | transporters | contracts | orders | order_items
  file_name text,
  file_size bigint,
  row_count int default 0,
  valid_count int default 0,
  warning_count int default 0,
  error_count int default 0,
  committed_count int default 0,
  status text not null default 'UPLOADED',
  -- UPLOADED | MAPPED | VALIDATED | COMMITTED | PARTIAL | FAILED | ROLLED_BACK
  column_mapping jsonb default '{}'::jsonb,
  uploaded_by uuid,
  uploaded_at timestamptz not null default now(),
  validated_at timestamptz,
  committed_by uuid,
  committed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists migration_batches_entity_status_idx
  on public.migration_batches (entity_type, status, uploaded_at desc);

-- ============================================================
-- MIGRATION STAGING ROWS
-- ============================================================
create table if not exists public.migration_staging (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.migration_batches(id) on delete cascade,
  row_index int not null,
  raw_data jsonb not null,
  mapped_data jsonb,
  status text not null default 'PENDING',
  -- PENDING | VALID | WARNING | ERROR | COMMITTED | SKIPPED
  errors text[] default '{}',
  warnings text[] default '{}',
  commit_target_id uuid,
  commit_target_table text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists migration_staging_batch_status_idx
  on public.migration_staging (batch_id, status);

-- ============================================================
-- MIGRATION LOG
-- ============================================================
create table if not exists public.migration_log (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.migration_batches(id) on delete cascade,
  step text not null,
  -- UPLOAD | MAP | VALIDATE | DRYRUN | COMMIT | ROLLBACK
  message text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  actor_user_id uuid
);

create index if not exists migration_log_batch_idx
  on public.migration_log (batch_id, created_at desc);

-- ============================================================
-- AUTO updated_at
-- ============================================================
create or replace function public.migration_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists migration_batches_touch on public.migration_batches;
create trigger migration_batches_touch
  before update on public.migration_batches
  for each row execute function public.migration_touch_updated_at();

drop trigger if exists migration_staging_touch on public.migration_staging;
create trigger migration_staging_touch
  before update on public.migration_staging
  for each row execute function public.migration_touch_updated_at();

-- ============================================================
-- RLS
-- ============================================================
alter table public.migration_batches enable row level security;
alter table public.migration_staging enable row level security;
alter table public.migration_log enable row level security;

-- Batches
drop policy if exists "migration_batches_read" on public.migration_batches;
create policy "migration_batches_read" on public.migration_batches
  for select using (auth.uid() is not null);

drop policy if exists "migration_batches_write" on public.migration_batches;
create policy "migration_batches_write" on public.migration_batches for all
  using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'system_admin'
    )
  )
  with check (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'system_admin'
    )
  );

-- Staging
drop policy if exists "migration_staging_read" on public.migration_staging;
create policy "migration_staging_read" on public.migration_staging
  for select using (auth.uid() is not null);

drop policy if exists "migration_staging_write" on public.migration_staging;
create policy "migration_staging_write" on public.migration_staging for all
  using (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'system_admin'
    )
  )
  with check (
    exists (
      select 1 from user_roles ur
      join roles r on r.id = ur.role_id
      where ur.user_id = auth.uid() and r.name = 'system_admin'
    )
  );

-- Log
drop policy if exists "migration_log_read" on public.migration_log;
create policy "migration_log_read" on public.migration_log
  for select using (auth.uid() is not null);

drop policy if exists "migration_log_insert" on public.migration_log;
create policy "migration_log_insert" on public.migration_log for insert
  with check (auth.uid() is not null);

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
insert into storage.buckets (id, name, public)
values ('migration-files', 'migration-files', false)
on conflict (id) do nothing;

drop policy if exists "migration_files_upload" on storage.objects;
create policy "migration_files_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'migration-files');

drop policy if exists "migration_files_read" on storage.objects;
create policy "migration_files_read" on storage.objects for select to authenticated
  using (bucket_id = 'migration-files');

drop policy if exists "migration_files_delete" on storage.objects;
create policy "migration_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'migration-files');