-- =========================================================
-- 008_flow.sql — Phase 4: Procurement, Shipment, Delivery, BAST
-- =========================================================

-- ---------------------------------------------------------
-- SEQUENCES
-- ---------------------------------------------------------
create sequence if not exists public.procurement_number_seq start 1;
create sequence if not exists public.shipment_number_seq start 1;
create sequence if not exists public.delivery_number_seq start 1;
create sequence if not exists public.bast_number_seq start 1;

create or replace function public.generate_procurement_number() returns text language plpgsql as $$
begin return 'PR-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.procurement_number_seq')::text, 4, '0'); end $$;
create or replace function public.generate_shipment_number() returns text language plpgsql as $$
begin return 'SH-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.shipment_number_seq')::text, 4, '0'); end $$;
create or replace function public.generate_delivery_number() returns text language plpgsql as $$
begin return 'DL-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.delivery_number_seq')::text, 4, '0'); end $$;
create or replace function public.generate_bast_number() returns text language plpgsql as $$
begin return 'BAST-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.bast_number_seq')::text, 4, '0'); end $$;

-- ---------------------------------------------------------
-- PROCUREMENTS
-- ---------------------------------------------------------
create table if not exists public.procurements (
  id uuid primary key default gen_random_uuid(),
  procurement_number text unique not null default public.generate_procurement_number(),
  order_id uuid not null references public.orders(id) on delete cascade,
  vendor_id uuid references public.vendors(id),
  vendor_po text,
  vendor_invoice text,
  reference_date date,
  currency text not null default 'IDR',
  exchange_rate numeric(20,6) not null default 1,
  material_cost numeric(20,2) not null default 0,
  status text not null default 'DRAFT',
  remarks text,
  submitted_at timestamptz,
  submitted_by uuid,
  verified_at timestamptz,
  verified_by uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists procurements_order_idx on public.procurements (order_id);

create table if not exists public.procurement_items (
  id uuid primary key default gen_random_uuid(),
  procurement_id uuid not null references public.procurements(id) on delete cascade,
  product_id uuid not null references public.products(id),
  description text,
  qty numeric(20,4) not null default 0,
  uom text not null default 'MT',
  unit_price numeric(20,2) not null default 0,
  currency text not null default 'IDR',
  exchange_rate numeric(20,6) not null default 1,
  line_value numeric(20,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists procurement_items_proc_idx on public.procurement_items (procurement_id);

-- recompute procurement material cost
create or replace function public.recompute_procurement_total(p_proc_id uuid)
returns void language plpgsql as $$
declare v_total numeric(20,2);
begin
  select coalesce(sum(line_value),0) into v_total
  from public.procurement_items where procurement_id = p_proc_id;
  update public.procurements set material_cost = v_total, updated_at = now() where id = p_proc_id;
end $$;

create or replace function public.procurement_items_after_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE') then perform public.recompute_procurement_total(old.procurement_id); return old;
  else perform public.recompute_procurement_total(new.procurement_id); return new; end if;
end $$;

drop trigger if exists procurement_items_recompute on public.procurement_items;
create trigger procurement_items_recompute
  after insert or update or delete on public.procurement_items
  for each row execute function public.procurement_items_after_change();

-- ---------------------------------------------------------
-- SHIPMENTS
-- ---------------------------------------------------------
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  shipment_number text unique not null default public.generate_shipment_number(),
  order_id uuid not null references public.orders(id) on delete cascade,
  shipment_date date,
  transporter_id uuid references public.transporters(id),
  vehicle_ref text,
  origin text,
  destination text,
  delivery_ref text,
  status text not null default 'DRAFT',
  remarks text,
  confirmed_at timestamptz,
  confirmed_by uuid,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists shipments_order_idx on public.shipments (order_id);

create table if not exists public.shipment_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  product_id uuid not null references public.products(id),
  description text,
  qty numeric(20,4) not null default 0,
  uom text not null default 'MT',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists shipment_items_shipment_idx on public.shipment_items (shipment_id);

-- ---------------------------------------------------------
-- DELIVERIES (one per shipment)
-- ---------------------------------------------------------
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  delivery_number text unique not null default public.generate_delivery_number(),
  order_id uuid not null references public.orders(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  delivery_date date not null,
  receiving_party text,
  delivery_note text,
  location text,
  remarks text,
  status text not null default 'COMPLETED',
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists deliveries_order_idx on public.deliveries (order_id);
create index if not exists deliveries_shipment_idx on public.deliveries (shipment_id);

-- ---------------------------------------------------------
-- BASTS
-- ---------------------------------------------------------
create table if not exists public.basts (
  id uuid primary key default gen_random_uuid(),
  bast_number text unique not null default public.generate_bast_number(),
  order_id uuid not null references public.orders(id) on delete cascade,
  delivery_id uuid references public.deliveries(id),
  bast_date date,
  receiver_name text,
  signed_by text,
  signed_document_ref text,
  remarks text,
  status text not null default 'DRAFT',
  submitted_at timestamptz,
  submitted_by uuid,
  verified_at timestamptz,
  verified_by uuid,
  completed_at timestamptz,
  completed_by uuid,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists basts_order_idx on public.basts (order_id);

-- ---------------------------------------------------------
-- STAGE HELPERS
-- ---------------------------------------------------------
-- Recompute order's stage statuses based on child records
create or replace function public.recompute_order_stages(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_proc_status text := 'NOT_STARTED';
  v_ship_status text := 'NOT_STARTED';
  v_deliv_status text := 'NOT_STARTED';
  v_bast_status text := 'NOT_STARTED';
  v_current_stage text := 'PO';
begin
  -- Procurement
  if exists (select 1 from procurements where order_id = p_order_id and status = 'VERIFIED') then
    v_proc_status := 'COMPLETED';
  elsif exists (select 1 from procurements where order_id = p_order_id and status = 'SUBMITTED') then
    v_proc_status := 'SUBMITTED';
  elsif exists (select 1 from procurements where order_id = p_order_id and status = 'DRAFT') then
    v_proc_status := 'DRAFT';
  end if;

  -- Shipment
  if exists (select 1 from shipments where order_id = p_order_id and status = 'CONFIRMED') then
    v_ship_status := 'COMPLETED';
  elsif exists (select 1 from shipments where order_id = p_order_id and status = 'DRAFT') then
    v_ship_status := 'DRAFT';
  end if;

  -- Delivery
  if exists (select 1 from deliveries where order_id = p_order_id) then
    v_deliv_status := 'COMPLETED';
  end if;

  -- BAST
  if exists (select 1 from basts where order_id = p_order_id and status = 'COMPLETED') then
    v_bast_status := 'COMPLETED';
  elsif exists (select 1 from basts where order_id = p_order_id and status = 'VERIFIED') then
    v_bast_status := 'VERIFIED';
  elsif exists (select 1 from basts where order_id = p_order_id and status = 'SUBMITTED') then
    v_bast_status := 'SUBMITTED';
  elsif exists (select 1 from basts where order_id = p_order_id and status = 'DRAFT') then
    v_bast_status := 'DRAFT';
  end if;

  -- Determine current stage (furthest incomplete)
  if v_bast_status = 'COMPLETED' then v_current_stage := 'COMPLETE';
  elsif v_deliv_status = 'COMPLETED' then v_current_stage := 'BAST';
  elsif v_ship_status = 'COMPLETED' then v_current_stage := 'DELIVERY';
  elsif v_proc_status = 'COMPLETED' then v_current_stage := 'SHIPMENT';
  elsif v_proc_status <> 'NOT_STARTED' then v_current_stage := 'PROCUREMENT';
  else v_current_stage := 'PO';
  end if;

  update public.orders
  set procurement_status = v_proc_status,
      shipment_status = v_ship_status,
      delivery_status = v_deliv_status,
      bast_status = v_bast_status,
      current_stage = v_current_stage,
      updated_at = now()
  where id = p_order_id;
end $$;

grant execute on function public.recompute_order_stages(uuid) to authenticated;

-- Auto-recompute on child changes
create or replace function public.trg_recompute_order_stages()
returns trigger language plpgsql as $$
declare v_order_id uuid;
begin
  if (tg_op = 'DELETE') then v_order_id := old.order_id;
  else v_order_id := new.order_id;
  end if;
  perform public.recompute_order_stages(v_order_id);
  if (tg_op = 'DELETE') then return old; else return new; end if;
end $$;

drop trigger if exists procurements_stage on public.procurements;
create trigger procurements_stage after insert or update or delete on public.procurements
  for each row execute function public.trg_recompute_order_stages();

drop trigger if exists shipments_stage on public.shipments;
create trigger shipments_stage after insert or update or delete on public.shipments
  for each row execute function public.trg_recompute_order_stages();

drop trigger if exists deliveries_stage on public.deliveries;
create trigger deliveries_stage after insert or update or delete on public.deliveries
  for each row execute function public.trg_recompute_order_stages();

drop trigger if exists basts_stage on public.basts;
create trigger basts_stage after insert or update or delete on public.basts
  for each row execute function public.trg_recompute_order_stages();

-- ---------------------------------------------------------
-- AUTO updated_at
-- ---------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['procurements','procurement_items','shipments','shipment_items','deliveries','basts']
  loop
    execute format('drop trigger if exists %1$s_touch on public.%1$s;', t);
    execute format('create trigger %1$s_touch before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
alter table public.procurements enable row level security;
alter table public.procurement_items enable row level security;
alter table public.shipments enable row level security;
alter table public.shipment_items enable row level security;
alter table public.deliveries enable row level security;
alter table public.basts enable row level security;

-- READ: authenticated
do $$
declare t text;
begin
  foreach t in array array['procurements','procurement_items','shipments','shipment_items','deliveries','basts']
  loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s;', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (auth.uid() is not null);', t);
  end loop;
end $$;

-- WRITE: procurement
drop policy if exists "procurements_insert" on public.procurements;
create policy "procurements_insert" on public.procurements for insert
  with check (public.has_permission('PROCUREMENT_CREATE'));
drop policy if exists "procurements_update" on public.procurements;
create policy "procurements_update" on public.procurements for update
  using (public.has_permission('PROCUREMENT_CREATE') or public.has_permission('PROCUREMENT_VERIFY'));
drop policy if exists "procurements_delete" on public.procurements;
create policy "procurements_delete" on public.procurements for delete
  using (public.has_permission('PROCUREMENT_CREATE'));

drop policy if exists "procurement_items_insert" on public.procurement_items;
create policy "procurement_items_insert" on public.procurement_items for insert
  with check (public.has_permission('PROCUREMENT_CREATE'));
drop policy if exists "procurement_items_update" on public.procurement_items;
create policy "procurement_items_update" on public.procurement_items for update
  using (public.has_permission('PROCUREMENT_CREATE'));
drop policy if exists "procurement_items_delete" on public.procurement_items;
create policy "procurement_items_delete" on public.procurement_items for delete
  using (public.has_permission('PROCUREMENT_CREATE'));

-- WRITE: shipment
drop policy if exists "shipments_insert" on public.shipments;
create policy "shipments_insert" on public.shipments for insert
  with check (public.has_permission('SHIPMENT_CREATE'));
drop policy if exists "shipments_update" on public.shipments;
create policy "shipments_update" on public.shipments for update
  using (public.has_permission('SHIPMENT_CREATE') or public.has_permission('SHIPMENT_CONFIRM'));
drop policy if exists "shipments_delete" on public.shipments;
create policy "shipments_delete" on public.shipments for delete
  using (public.has_permission('SHIPMENT_CREATE'));

drop policy if exists "shipment_items_insert" on public.shipment_items;
create policy "shipment_items_insert" on public.shipment_items for insert
  with check (public.has_permission('SHIPMENT_CREATE'));
drop policy if exists "shipment_items_update" on public.shipment_items;
create policy "shipment_items_update" on public.shipment_items for update
  using (public.has_permission('SHIPMENT_CREATE'));
drop policy if exists "shipment_items_delete" on public.shipment_items;
create policy "shipment_items_delete" on public.shipment_items for delete
  using (public.has_permission('SHIPMENT_CREATE'));

-- WRITE: delivery
drop policy if exists "deliveries_insert" on public.deliveries;
create policy "deliveries_insert" on public.deliveries for insert
  with check (public.has_permission('SHIPMENT_CONFIRM'));
drop policy if exists "deliveries_update" on public.deliveries;
create policy "deliveries_update" on public.deliveries for update
  using (public.has_permission('SHIPMENT_CONFIRM'));

-- WRITE: bast
drop policy if exists "basts_insert" on public.basts;
create policy "basts_insert" on public.basts for insert
  with check (public.has_permission('BAST_CREATE'));
drop policy if exists "basts_update" on public.basts;
create policy "basts_update" on public.basts for update
  using (public.has_permission('BAST_CREATE') or public.has_permission('BAST_VERIFY'));
drop policy if exists "basts_delete" on public.basts;
create policy "basts_delete" on public.basts for delete
  using (public.has_permission('BAST_CREATE'));