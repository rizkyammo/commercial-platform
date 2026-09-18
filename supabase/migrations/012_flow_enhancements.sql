-- =========================================================
-- 012_flow_enhancements.sql
-- Shipment transport cost, BAST file, tax rate, margin recompute
-- =========================================================

-- Shipments: transport_cost
alter table public.shipments
  add column if not exists transport_cost numeric(20,2) not null default 0;

-- Basts: file path
alter table public.basts
  add column if not exists signed_document_path text;

-- Orders: tax rate (default PPN 11%)
alter table public.orders
  add column if not exists tax_rate numeric(5,2) not null default 11;

-- ---------------------------------------------------------
-- Consolidated recompute_order_totals
-- ---------------------------------------------------------
create or replace function public.recompute_order_totals(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_selling numeric(20,2);
  v_material numeric(20,2);
  v_transport numeric(20,2);
  v_cost numeric(20,2);
  v_margin numeric(20,2);
begin
  select coalesce(sum(line_value), 0) into v_selling
  from order_items where order_id = p_order_id;

  -- Material cost = SEMUA procurement (termasuk draft/submitted) agar user lihat progress
  select coalesce(sum(material_cost), 0) into v_material
  from procurements where order_id = p_order_id;

  -- Transport cost = SEMUA shipment (termasuk draft)
  select coalesce(sum(transport_cost), 0) into v_transport
  from shipments where order_id = p_order_id;

  v_cost := v_material + v_transport;
  v_margin := v_selling - v_cost;

  update orders
  set selling_value = v_selling,
      total_direct_cost = v_cost,
      margin = v_margin,
      updated_at = now()
  where id = p_order_id;
end $$;

-- Trigger function untuk procurements & shipments
create or replace function public.trg_recompute_order_totals()
returns trigger language plpgsql as $$
declare v_order_id uuid;
begin
  if (tg_op = 'DELETE') then v_order_id := old.order_id;
  else v_order_id := new.order_id; end if;
  perform public.recompute_order_totals(v_order_id);
  if (tg_op = 'DELETE') then return old; else return new; end if;
end $$;

drop trigger if exists procurements_totals on public.procurements;
create trigger procurements_totals
  after insert or update or delete on public.procurements
  for each row execute function public.trg_recompute_order_totals();

drop trigger if exists shipments_totals on public.shipments;
create trigger shipments_totals
  after insert or update or delete on public.shipments
  for each row execute function public.trg_recompute_order_totals();

-- ---------------------------------------------------------
-- Storage bucket untuk BAST
-- ---------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('bast-documents', 'bast-documents', false)
on conflict (id) do nothing;

drop policy if exists "bast_docs_upload" on storage.objects;
create policy "bast_docs_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bast-documents');

drop policy if exists "bast_docs_read" on storage.objects;
create policy "bast_docs_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'bast-documents');

drop policy if exists "bast_docs_delete" on storage.objects;
create policy "bast_docs_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'bast-documents');

-- ---------------------------------------------------------
-- Backfill margin existing orders
-- ---------------------------------------------------------
update public.orders o
set total_direct_cost = coalesce((
      select sum(material_cost) from procurements where order_id = o.id
    ), 0) + coalesce((
      select sum(transport_cost) from shipments where order_id = o.id
    ), 0);

update public.orders
set margin = selling_value - total_direct_cost;