-- =========================================================
-- 017_spatial.sql — Spatial Business Intelligence
-- =========================================================

create extension if not exists postgis;

-- ---------------------------------------------------------
-- PROSPECTS
-- ---------------------------------------------------------
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  type text, -- Quarry | Coal Mining | Infrastructure | Other
  latitude numeric(10,7),
  longitude numeric(10,7),
  location geometry(Point, 4326),
  address text,
  province text,
  city text,
  est_demand numeric(20,4) default 0,
  est_demand_uom text default 'MT',
  score numeric(5,2) default 0,
  status text not null default 'NEW', -- NEW | CONTACTED | QUALIFIED | CONVERTED | LOST
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists prospects_location_idx on public.prospects using gist (location);
create index if not exists prospects_status_idx on public.prospects (status);

-- Trigger to compute location from lat/lng
create or replace function public.prospects_set_geometry()
returns trigger language plpgsql as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := ST_SetSRID(ST_MakePoint(new.longitude::float8, new.latitude::float8), 4326);
  end if;
  return new;
end $$;

drop trigger if exists prospects_geom on public.prospects;
create trigger prospects_geom
  before insert or update on public.prospects
  for each row execute function public.prospects_set_geometry();

-- ---------------------------------------------------------
-- OPERATIONAL BASES
-- ---------------------------------------------------------
create table if not exists public.operational_bases (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  type text, -- Main Warehouse | Satellite | Stock Point
  latitude numeric(10,7),
  longitude numeric(10,7),
  location geometry(Point, 4326),
  address text,
  province text,
  city text,
  capacity numeric(20,4) default 0,
  capacity_uom text default 'MT',
  operational_cost numeric(20,2) default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists bases_location_idx on public.operational_bases using gist (location);

create or replace function public.bases_set_geometry()
returns trigger language plpgsql as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location := ST_SetSRID(ST_MakePoint(new.longitude::float8, new.latitude::float8), 4326);
  end if;
  return new;
end $$;

drop trigger if exists bases_geom on public.operational_bases;
create trigger bases_geom
  before insert or update on public.operational_bases
  for each row execute function public.bases_set_geometry();

-- ---------------------------------------------------------
-- MARKET / MINING AREAS
-- ---------------------------------------------------------
create table if not exists public.market_areas (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  type text, -- Mining | Quarry | Infrastructure | Market
  geometry geometry(MultiPolygon, 4326),
  province text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now()
);

create index if not exists market_areas_geom_idx on public.market_areas using gist (geometry);

-- ---------------------------------------------------------
-- COVERAGE AREAS (calculated cache)
-- ---------------------------------------------------------
create table if not exists public.coverage_areas (
  id uuid primary key default gen_random_uuid(),
  base_id uuid not null references public.operational_bases(id) on delete cascade,
  radius_km numeric(10,2) not null,
  geometry geometry(Polygon, 4326),
  computed_at timestamptz not null default now()
);

create index if not exists coverage_geom_idx on public.coverage_areas using gist (geometry);

-- Function: compute coverage polygon dari base + radius
create or replace function public.recompute_coverage(p_base_id uuid, p_radius_km numeric)
returns void language plpgsql security definer as $$
declare
  v_geom geometry;
  v_buffer geometry;
begin
  select location into v_geom from operational_bases where id = p_base_id;
  if v_geom is null then return; end if;

  -- Buffer dalam meter (radius * 1000), lalu convert ke polygon
  v_buffer := ST_Buffer(v_geom::geography, p_radius_km * 1000)::geometry;

  delete from coverage_areas where base_id = p_base_id and radius_km = p_radius_km;

  insert into coverage_areas (base_id, radius_km, geometry)
  values (p_base_id, p_radius_km, ST_Multi(v_buffer)::geometry);
end $$;

-- ---------------------------------------------------------
-- SCENARIOS
-- ---------------------------------------------------------
create table if not exists public.spatial_scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  base_lat numeric(10,7) not null,
  base_lng numeric(10,7) not null,
  radius_km numeric(10,2) not null default 50,
  status text not null default 'DRAFT', -- DRAFT | ACTIVE | ARCHIVED
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- SCENARIO RESULTS (cache coverage & metrics)
-- ---------------------------------------------------------
create table if not exists public.scenario_results (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.spatial_scenarios(id) on delete cascade,
  prospects_covered int default 0,
  new_prospects int default 0,
  sites_covered int default 0,
  estimated_demand numeric(20,4) default 0,
  score numeric(5,2) default 0,
  computed_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- HELPER: find prospects within radius of a point
-- ---------------------------------------------------------
create or replace function public.prospects_within_radius(
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric
)
returns table(prospect_id uuid)
language sql stable as $$
  select id
  from prospects
  where is_active = true
    and ST_DWithin(
      location::geography,
      ST_SetSRID(ST_MakePoint(p_lng::float8, p_lat::float8), 4326)::geography,
      p_radius_km * 1000
    );
$$;

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
alter table public.prospects enable row level security;
alter table public.operational_bases enable row level security;
alter table public.market_areas enable row level security;
alter table public.coverage_areas enable row level security;
alter table public.spatial_scenarios enable row level security;
alter table public.scenario_results enable row level security;

-- Read all for authenticated
do $$
declare t text;
begin
  foreach t in array array['prospects','operational_bases','market_areas','coverage_areas','spatial_scenarios','scenario_results']
  loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s;', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (auth.uid() is not null);', t);
  end loop;
end $$;

-- Write: SPATIAL_EDIT_PROSPECT
drop policy if exists "prospects_write" on public.prospects;
create policy "prospects_write" on public.prospects for all
  using (public.has_permission('SPATIAL_EDIT_PROSPECT'))
  with check (public.has_permission('SPATIAL_EDIT_PROSPECT'));

drop policy if exists "bases_write" on public.operational_bases;
create policy "bases_write" on public.operational_bases for all
  using (public.has_permission('SPATIAL_EDIT_PROSPECT'))
  with check (public.has_permission('SPATIAL_EDIT_PROSPECT'));

drop policy if exists "market_areas_write" on public.market_areas;
create policy "market_areas_write" on public.market_areas for all
  using (public.has_permission('SPATIAL_EDIT_PROSPECT'))
  with check (public.has_permission('SPATIAL_EDIT_PROSPECT'));

drop policy if exists "coverage_write" on public.coverage_areas;
create policy "coverage_write" on public.coverage_areas for all
  using (public.has_permission('SPATIAL_EDIT_PROSPECT'))
  with check (public.has_permission('SPATIAL_EDIT_PROSPECT'));

-- Scenarios: SPATIAL_SCENARIO
drop policy if exists "scenarios_write" on public.spatial_scenarios;
create policy "scenarios_write" on public.spatial_scenarios for all
  using (public.has_permission('SPATIAL_SCENARIO'))
  with check (public.has_permission('SPATIAL_SCENARIO'));

drop policy if exists "scenario_results_write" on public.scenario_results;
create policy "scenario_results_write" on public.scenario_results for all
  using (public.has_permission('SPATIAL_SCENARIO'))
  with check (public.has_permission('SPATIAL_SCENARIO'));

-- ---------------------------------------------------------
-- SEED: Demo prospects
-- ---------------------------------------------------------
insert into public.prospects (code, name, type, latitude, longitude, province, city, est_demand, score, status)
values
  ('PROSP-001', 'Prospect A', 'Quarry', -1.5, 116.0, 'Kalimantan Timur', 'Balikpapan', 5000, 85, 'QUALIFIED'),
  ('PROSP-002', 'Prospect B', 'Coal Mining', -2.1, 116.5, 'Kalimantan Timur', 'Samarinda', 12000, 92, 'QUALIFIED'),
  ('PROSP-003', 'Prospect C', 'Infrastructure', -3.2, 114.5, 'Kalimantan Selatan', 'Banjarmasin', 8000, 78, 'CONTACTED'),
  ('PROSP-004', 'Prospect D', 'Coal Mining', -0.5, 117.0, 'Kalimantan Timur', 'Bontang', 15000, 88, 'NEW'),
  ('PROSP-005', 'Prospect E', 'Quarry', -2.8, 114.0, 'Kalimantan Tengah', 'Palangka Raya', 3500, 65, 'NEW')
on conflict (code) do nothing;