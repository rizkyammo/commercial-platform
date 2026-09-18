-- =========================================================
-- 003_master_data.sql — Phase 2 Master Data
-- =========================================================

create extension if not exists postgis;

-- ---------------------------------------------------------
-- CUSTOMERS
-- ---------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  type text,
  tax_no text,
  address text,
  phone text,
  email text,
  industry text,
  payment_term_days int not null default 30,
  credit_limit numeric(20,2) not null default 0,
  pic_name text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists customers_code_idx on public.customers (code);
create index if not exists customers_name_idx on public.customers (name);

-- ---------------------------------------------------------
-- SITES
-- ---------------------------------------------------------
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  customer_id uuid not null references public.customers(id),
  location geometry(Point, 4326),
  latitude numeric(10,7),
  longitude numeric(10,7),
  address text,
  province text,
  city text,
  business_model text,
  site_status text not null default 'Active',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists sites_customer_idx on public.sites (customer_id);
create index if not exists sites_location_idx on public.sites using gist (location);

-- Auto-populate geometry from lat/lng
create or replace function public.sites_set_geometry()
returns trigger language plpgsql as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := ST_SetSRID(ST_MakePoint(new.longitude::float8, new.latitude::float8), 4326);
  else
    new.location := null;
  end if;
  return new;
end;
$$;

drop trigger if exists sites_set_geometry_trg on public.sites;
create trigger sites_set_geometry_trg
  before insert or update on public.sites
  for each row execute function public.sites_set_geometry();

-- ---------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  category text,
  uom text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------
-- VENDORS
-- ---------------------------------------------------------
create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  type text,
  tax_no text,
  address text,
  phone text,
  email text,
  contact_person text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------
-- TRANSPORTERS
-- ---------------------------------------------------------
create table if not exists public.transporters (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  vehicle_type text,
  plate_number text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- ---------------------------------------------------------
-- CONTRACTS
-- ---------------------------------------------------------
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  customer_id uuid not null references public.customers(id),
  site_id uuid references public.sites(id),
  contract_number text,
  start_date date,
  end_date date,
  value numeric(20,2) not null default 0,
  currency text not null default 'IDR',
  status text not null default 'Draft',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists contracts_customer_idx on public.contracts (customer_id);
create index if not exists contracts_site_idx on public.contracts (site_id);

-- ---------------------------------------------------------
-- CONTRACT RULES (1-1 with contract)
-- ---------------------------------------------------------
create table if not exists public.contract_rules (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid unique not null references public.contracts(id) on delete cascade,
  fulfillment_model text not null default 'DIRECT_DELIVERY',
  billing_model text not null default 'FULL',
  pricing_model text not null default 'FIXED_IDR',
  payment_model text,
  logistics_model text not null default 'INCLUDED',
  requires_bast boolean not null default true,
  requires_compliance boolean not null default true,
  requires_consumption_report boolean not null default false,
  requires_customer_approval boolean not null default false,
  invoice_trigger text,
  revenue_recognition_trigger text,
  payment_term_days int not null default 30,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- BUSINESS PROCESS TEMPLATES
-- ---------------------------------------------------------
create table if not exists public.business_process_templates (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  description text,
  stages jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now()
);

-- =========================================================
-- PERMISSION HELPER
-- =========================================================
create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select perm = any(public.current_user_permissions());
$$;

-- =========================================================
-- RLS
-- =========================================================
alter table public.customers enable row level security;
alter table public.sites enable row level security;
alter table public.products enable row level security;
alter table public.vendors enable row level security;
alter table public.transporters enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_rules enable row level security;
alter table public.business_process_templates enable row level security;

-- Read for authenticated
create policy "customers_read" on public.customers
  for select using (auth.uid() is not null);
create policy "sites_read" on public.sites
  for select using (auth.uid() is not null);
create policy "products_read" on public.products
  for select using (auth.uid() is not null);
create policy "vendors_read" on public.vendors
  for select using (auth.uid() is not null);
create policy "transporters_read" on public.transporters
  for select using (auth.uid() is not null);
create policy "contracts_read" on public.contracts
  for select using (auth.uid() is not null);
create policy "contract_rules_read" on public.contract_rules
  for select using (auth.uid() is not null);
create policy "bpt_read" on public.business_process_templates
  for select using (auth.uid() is not null);

-- Write requires MASTER_DATA_MANAGE
do $$
declare t text;
begin
  foreach t in array array['customers','sites','products','vendors','transporters','contracts','contract_rules','business_process_templates']
  loop
    execute format($f$
      create policy "%1$s_insert" on public.%1$s
        for insert with check (public.has_permission('MASTER_DATA_MANAGE'));
      create policy "%1$s_update" on public.%1$s
        for update using (public.has_permission('MASTER_DATA_MANAGE'));
      create policy "%1$s_delete" on public.%1$s
        for delete using (public.has_permission('MASTER_DATA_MANAGE'));
    $f$, t);
  end loop;
end $$;

-- =========================================================
-- AUTO updated_at
-- =========================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['customers','sites','products','vendors','transporters','contracts','contract_rules','business_process_templates']
  loop
    execute format('drop trigger if exists %1$s_touch on public.%1$s;', t);
    execute format('create trigger %1$s_touch before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;