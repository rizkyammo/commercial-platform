-- =========================================================
-- 016_tax.sql — PPN 11% + PPh 23 2%
-- =========================================================

-- Rename existing tax_rate sebagai ppn_rate (kalau sudah ada, skip)
-- Saya pakai kolom baru untuk kebersihan
alter table public.orders
  add column if not exists ppn_rate numeric(5,2) not null default 11,
  add column if not exists pph23_rate numeric(5,2) not null default 2,
  add column if not exists ppn_output numeric(20,2) not null default 0,
  add column if not exists ppn_input numeric(20,2) not null default 0,
  add column if not exists ppn_payable numeric(20,2) not null default 0,
  add column if not exists pph23_amount numeric(20,2) not null default 0,
  add column if not exists total_tax numeric(20,2) not null default 0,
  add column if not exists margin_before_tax numeric(20,2) not null default 0,
  add column if not exists margin_after_tax numeric(20,2) not null default 0;

-- Backfill ppn_rate dari tax_rate existing
update public.orders
set ppn_rate = coalesce(tax_rate, 11)
where ppn_rate is null or ppn_rate = 11;

-- ---------------------------------------------------------
-- RECOMPUTE ORDER TOTALS dengan pajak
-- ---------------------------------------------------------
create or replace function public.recompute_order_totals(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_selling numeric(20,2);
  v_material numeric(20,2);
  v_transport numeric(20,2);
  v_cost numeric(20,2);
  v_margin numeric(20,2);
  v_ppn_rate numeric(5,2);
  v_pph23_rate numeric(5,2);
  v_ppn_output numeric(20,2);
  v_ppn_input numeric(20,2);
  v_ppn_payable numeric(20,2);
  v_pph23 numeric(20,2);
  v_total_tax numeric(20,2);
  v_margin_after numeric(20,2);
begin
  select coalesce(sum(line_value),0) into v_selling
  from order_items where order_id = p_order_id;

  select coalesce(sum(material_cost),0) into v_material
  from procurements where order_id = p_order_id;

  select coalesce(sum(transport_cost),0) into v_transport
  from shipments where order_id = p_order_id;

  select ppn_rate, pph23_rate into v_ppn_rate, v_pph23_rate
  from orders where id = p_order_id;

  v_cost := v_material + v_transport;
  v_margin := v_selling - v_cost;

  -- PPN Output dari selling
  v_ppn_output := v_selling * coalesce(v_ppn_rate, 11) / 100;

  -- PPN Input dari material + transport (kredit pajak)
  v_ppn_input := (v_material + v_transport) * coalesce(v_ppn_rate, 11) / 100;

  -- PPN yang harus disetor
  v_ppn_payable := v_ppn_output - v_ppn_input;

  -- PPh 23 dari transport (withholding)
  v_pph23 := v_transport * coalesce(v_pph23_rate, 2) / 100;

  v_total_tax := v_ppn_payable + v_pph23;
  v_margin_after := v_margin - v_total_tax;

  update orders
  set selling_value = v_selling,
      total_direct_cost = v_cost,
      margin = v_margin,
      margin_before_tax = v_margin,
      ppn_output = v_ppn_output,
      ppn_input = v_ppn_input,
      ppn_payable = v_ppn_payable,
      pph23_amount = v_pph23,
      total_tax = v_total_tax,
      margin_after_tax = v_margin_after,
      updated_at = now()
  where id = p_order_id;
end $$;

-- ---------------------------------------------------------
-- RECOMPUTE SEMUA ORDER EXISTING
-- ---------------------------------------------------------
do $$
declare v_id uuid;
begin
  for v_id in select id from orders loop
    perform public.recompute_order_totals(v_id);
  end loop;
end $$;

-- ---------------------------------------------------------
-- VIEW: Tax Summary per Order
-- ---------------------------------------------------------
create or replace view public.order_tax_summary as
select
  o.id as order_id,
  o.order_number,
  o.customer_id,
  o.site_id,
  o.status,
  o.currency,
  o.selling_value as selling_dpp,
  o.total_direct_cost as cost_dpp,
  o.margin as margin_before_tax,
  case when o.selling_value > 0
    then (o.margin / o.selling_value) * 100 else 0
  end as margin_pct_before_tax,
  o.ppn_rate,
  o.ppn_output,
  o.ppn_input,
  o.ppn_payable,
  o.pph23_rate,
  o.pph23_amount,
  o.total_tax,
  o.margin_after_tax,
  case when o.selling_value > 0
    then (o.margin_after_tax / o.selling_value) * 100 else 0
  end as margin_pct_after_tax,
  o.created_at
from orders o;