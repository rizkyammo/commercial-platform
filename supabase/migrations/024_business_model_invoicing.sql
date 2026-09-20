-- =========================================================
-- 024_business_model_invoicing.sql  (FINAL)
-- Supports: Spot Basis, Consignment, BCM, Agency/Service Fee (AMNT-like)
-- =========================================================

-- ---------------------------------------------------------
-- 1) ORDERS: project grouping + order type
-- ---------------------------------------------------------
alter table public.orders
  add column if not exists project_code text,
  add column if not exists project_name text,
  add column if not exists order_type text not null default 'MATERIAL',
  -- MATERIAL | SERVICE_FEE | SERVICE_BACKCHARGE
  add column if not exists fee_reference text;

create index if not exists orders_project_code_idx on public.orders (project_code);
create index if not exists orders_order_type_idx on public.orders (order_type);

-- ---------------------------------------------------------
-- 2) ORDER ITEMS: line_type & margin_type & unit_cost
-- ---------------------------------------------------------
alter table public.order_items
  add column if not exists line_type text not null default 'MATERIAL',
  -- MATERIAL | SERVICE_LICENSE | SERVICE_MIXING | SERVICE_UREA
  -- SERVICE_BACKCHARGE | SERVICE_OTHER
  add column if not exists margin_type text not null default 'PASS_THROUGH',
  -- PASS_THROUGH | FEE
  add column if not exists unit_cost numeric(20,2) not null default 0;

create index if not exists order_items_line_type_idx on public.order_items (line_type);
create index if not exists order_items_margin_type_idx on public.order_items (margin_type);

-- ---------------------------------------------------------
-- 3) INVOICES: extend
-- ---------------------------------------------------------
alter table public.invoices
  add column if not exists billing_model text,
  -- SPOT_BASIS | CONSIGNMENT | BCM | AGENCY
  add column if not exists invoice_trigger text,
  -- BAST_COMPLETE | USAGE_REPORT | PRODUCTION_VOLUME | SHIPMENT_CONFIRM | MANUAL
  add column if not exists payment_method text,
  -- CASH | TRANSFER | TERM
  add column if not exists period_start date,
  add column if not exists period_end date,
  add column if not exists period_type text,
  -- WEEKLY | BIWEEKLY | MONTHLY
  add column if not exists project_id uuid,
  add column if not exists site_id uuid,
  add column if not exists usage_report_id uuid,
  add column if not exists pph23_rate numeric(5,2) not null default 0,
  add column if not exists pph23_amount numeric(20,2) not null default 0;

update public.invoices
set billing_model = case
  when invoice_type = 'FULL' then 'SPOT_BASIS'
  when invoice_type = 'MONTHLY_USAGE' then 'CONSIGNMENT'
  when invoice_type = 'PROGRESSIVE' then 'BCM'
  else invoice_type
end
where billing_model is null;

create index if not exists invoices_billing_model_idx on public.invoices (billing_model);
create index if not exists invoices_period_idx on public.invoices (period_start, period_end);

-- ---------------------------------------------------------
-- 4) INVOICE ITEMS: line_type, margin_type, unit_cost
-- ---------------------------------------------------------
alter table public.invoice_items
  add column if not exists line_type text not null default 'MATERIAL',
  add column if not exists margin_type text not null default 'PASS_THROUGH',
  add column if not exists unit_cost numeric(20,2) not null default 0,
  add column if not exists stock_awal numeric(20,4),
  add column if not exists stock_akhir numeric(20,4),
  add column if not exists rate numeric(20,2);

create index if not exists invoice_items_line_type_idx on public.invoice_items (line_type);
create index if not exists invoice_items_margin_type_idx on public.invoice_items (margin_type);

-- ---------------------------------------------------------
-- 5) USAGE REPORTS (Consignment + BCM)
-- ---------------------------------------------------------
create sequence if not exists public.usage_report_number_seq start 1;

create or replace function public.generate_usage_report_number()
returns text language plpgsql as $$
begin
  return 'UR-' || to_char(now(), 'YYYYMM') || '-' ||
         lpad(nextval('public.usage_report_number_seq')::text, 4, '0');
end $$;

create table if not exists public.usage_reports (
  id uuid primary key default gen_random_uuid(),
  report_number text unique not null default public.generate_usage_report_number(),
  project_id uuid,
  project_code text,
  site_id uuid,
  customer_id uuid references public.customers(id),
  order_id uuid references public.orders(id),
  report_type text not null,
  -- CONSIGNMENT_USAGE | BCM_VOLUME
  period_start date not null,
  period_end date not null,
  period_type text not null default 'BIWEEKLY',
  -- WEEKLY | BIWEEKLY | MONTHLY  (override dari contract_rules.usage_period_type)
  status text not null default 'DRAFT',
  -- DRAFT | SUBMITTED | APPROVED | REJECTED | INVOICED
  total_qty numeric(20,4) not null default 0,
  total_amount numeric(20,2) not null default 0,
  total_transport numeric(20,2) not null default 0,
  invoice_id uuid references public.invoices(id),
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  reject_reason text,
  invoiced_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists usage_reports_project_idx on public.usage_reports (project_id);
create index if not exists usage_reports_project_code_idx on public.usage_reports (project_code);
create index if not exists usage_reports_order_idx on public.usage_reports (order_id);
create index if not exists usage_reports_status_idx on public.usage_reports (status);
create index if not exists usage_reports_period_idx on public.usage_reports (period_start, period_end);

create table if not exists public.usage_report_lines (
  id uuid primary key default gen_random_uuid(),
  usage_report_id uuid not null references public.usage_reports(id) on delete cascade,
  product_id uuid references public.products(id),
  description text,
  line_type text not null default 'MATERIAL',
  margin_type text not null default 'PASS_THROUGH',
  qty_usage numeric(20,4) not null default 0,
  uom text not null default 'MT',
  unit_price numeric(20,2) not null default 0,
  rate numeric(20,2),
  unit_cost numeric(20,2) not null default 0,
  amount numeric(20,2) not null default 0,
  transport_amount numeric(20,2) not null default 0,
  stock_awal numeric(20,4),
  stock_akhir numeric(20,4),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists usage_report_lines_report_idx on public.usage_report_lines (usage_report_id);

-- ---------------------------------------------------------
-- 6) STOCK MOVEMENTS (Consignment)
-- ---------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  project_code text,
  site_id uuid,
  product_id uuid not null references public.products(id),
  movement_type text not null,
  -- IN_SHIPMENT | OUT_USAGE | ADJUSTMENT | INITIAL
  qty numeric(20,4) not null,
  uom text not null default 'MT',
  reference_type text,
  reference_id uuid,
  movement_date date not null default current_date,
  unit_cost numeric(20,2),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists stock_movements_project_idx on public.stock_movements (project_id);
create index if not exists stock_movements_project_code_idx on public.stock_movements (project_code);
create index if not exists stock_movements_product_idx on public.stock_movements (product_id);
create index if not exists stock_movements_date_idx on public.stock_movements (movement_date);

-- ---------------------------------------------------------
-- 7) CONTRACT RULES: fee & billing config per customer
-- ---------------------------------------------------------
alter table public.contract_rules
  add column if not exists usage_period_type text default null,
  add column if not exists invoice_trigger text default null,
  add column if not exists payment_method text default null,
  add column if not exists has_service_fee boolean not null default false,
  add column if not exists fee_license_pct numeric(5,2) default null,
  add column if not exists fee_mixing_per_ton numeric(20,2) default null,
  add column if not exists fee_urea_per_ton numeric(20,2) default null,
  add column if not exists fee_backcharge_pct numeric(5,2) default null,
  add column if not exists default_business_model_per_order_type jsonb
    default '{
      "MATERIAL": "Back-to-Back Supply",
      "SERVICE_FEE": "Agency / Brand Distribution",
      "SERVICE_BACKCHARGE": "Integrated Supply + Service"
    }'::jsonb;

-- ---------------------------------------------------------
-- 8) RLS
-- ---------------------------------------------------------
alter table public.stock_movements enable row level security;
alter table public.usage_reports enable row level security;
alter table public.usage_report_lines enable row level security;

drop policy if exists "stock_movements_read" on public.stock_movements;
create policy "stock_movements_read" on public.stock_movements
  for select using (auth.uid() is not null);

drop policy if exists "usage_reports_read" on public.usage_reports;
create policy "usage_reports_read" on public.usage_reports
  for select using (auth.uid() is not null);

drop policy if exists "usage_report_lines_read" on public.usage_report_lines;
create policy "usage_report_lines_read" on public.usage_report_lines
  for select using (auth.uid() is not null);

drop policy if exists "usage_reports_write" on public.usage_reports;
create policy "usage_reports_write" on public.usage_reports for all using (
  public.has_permission('USAGE_REPORT_CREATE')
  or public.has_permission('USAGE_REPORT_APPROVE')
  or public.has_permission('INVOICE_MANAGE')
);

drop policy if exists "usage_report_lines_write" on public.usage_report_lines;
create policy "usage_report_lines_write" on public.usage_report_lines for all using (
  public.has_permission('USAGE_REPORT_CREATE')
  or public.has_permission('USAGE_REPORT_APPROVE')
  or public.has_permission('INVOICE_MANAGE')
);

drop policy if exists "stock_movements_write" on public.stock_movements;
create policy "stock_movements_write" on public.stock_movements for all using (
  public.has_permission('USAGE_REPORT_CREATE')
  or public.has_permission('INVOICE_MANAGE')
);

-- ---------------------------------------------------------
-- 9) PERMISSIONS
-- ---------------------------------------------------------
insert into public.permissions (code, description) values
  ('USAGE_REPORT_VIEW',    'View usage reports'),
  ('USAGE_REPORT_CREATE',  'Create and edit usage reports'),
  ('USAGE_REPORT_APPROVE', 'Approve usage reports'),
  ('INVOICE_GENERATE',     'Generate invoice from usage report')
on conflict (code) do nothing;

do $$
declare
  v_staff uuid; v_sup uuid; v_mgr uuid; v_admin uuid; v_viewer uuid;
begin
  select id into v_staff  from roles where name = 'commercial_staff';
  select id into v_sup    from roles where name = 'commercial_supervisor';
  select id into v_mgr    from roles where name = 'commercial_manager';
  select id into v_admin  from roles where name = 'system_admin';
  select id into v_viewer from roles where name = 'management_viewer';

  insert into role_permissions (role_id, permission_id)
  select v_staff, id from permissions
  where code in ('USAGE_REPORT_VIEW','USAGE_REPORT_CREATE')
  on conflict do nothing;

  insert into role_permissions (role_id, permission_id)
  select v_sup, id from permissions
  where code in ('USAGE_REPORT_VIEW','USAGE_REPORT_CREATE','USAGE_REPORT_APPROVE','INVOICE_GENERATE')
  on conflict do nothing;

  insert into role_permissions (role_id, permission_id)
  select v_mgr, id from permissions
  where code in ('USAGE_REPORT_VIEW','USAGE_REPORT_CREATE','USAGE_REPORT_APPROVE','INVOICE_GENERATE')
  on conflict do nothing;

  insert into role_permissions (role_id, permission_id)
  select v_viewer, id from permissions
  where code in ('USAGE_REPORT_VIEW')
  on conflict do nothing;

  insert into role_permissions (role_id, permission_id)
  select v_admin, id from permissions
  where code in ('USAGE_REPORT_VIEW','USAGE_REPORT_CREATE','USAGE_REPORT_APPROVE','INVOICE_GENERATE')
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------
-- 10) recompute_invoice_totals — support PPh 23
-- ---------------------------------------------------------
create or replace function public.recompute_invoice_totals(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(20,2);
  v_tax_rate numeric(5,2);
  v_pph23_rate numeric(5,2);
  v_paid numeric(20,2);
  v_exchange numeric(20,6);
  v_due date;
  v_status text;
  v_tax numeric(20,2);
  v_pph numeric(20,2);
  v_total numeric(20,2);
  v_amount_idr numeric(20,2);
  v_new_status text;
begin
  select coalesce(sum(line_value),0) into v_amount
  from invoice_items where invoice_id = p_invoice_id;

  select tax_rate, coalesce(pph23_rate,0), exchange_rate, due_date, status
  into v_tax_rate, v_pph23_rate, v_exchange, v_due, v_status
  from invoices where id = p_invoice_id;

  select coalesce(sum(amount),0) into v_paid
  from invoice_payments where invoice_id = p_invoice_id;

  v_tax := (v_amount * coalesce(v_tax_rate, 0)) / 100;
  v_pph := (v_amount * coalesce(v_pph23_rate, 0)) / 100;
  v_total := v_amount + v_tax - v_pph;
  v_amount_idr := v_total * coalesce(v_exchange, 1);

  v_new_status := v_status;
  if v_status not in ('DRAFT','CANCELLED') then
    if v_paid >= v_total and v_total > 0 then
      v_new_status := 'PAID';
    elsif v_paid > 0 then
      v_new_status := 'PARTIAL_PAID';
    elsif v_due is not null and v_due < current_date
          and v_status in ('ISSUED','SENT') then
      v_new_status := 'OVERDUE';
    end if;
  end if;

  update invoices
  set amount = v_amount,
      tax_amount = v_tax,
      pph23_amount = v_pph,
      amount_with_tax = v_total,
      amount_idr = v_amount_idr,
      paid_amount = v_paid,
      status = v_new_status,
      paid_at = case when v_new_status = 'PAID' then coalesce(paid_at, now()) else null end,
      updated_at = now()
  where id = p_invoice_id;
end $$;

create or replace function public.trg_recompute_invoice()
returns trigger language plpgsql as $$
declare v_id uuid;
begin
  if (tg_op = 'DELETE') then v_id := old.invoice_id; else v_id := new.invoice_id; end if;
  perform public.recompute_invoice_totals(v_id);
  if (tg_op = 'DELETE') then return old; else return new; end if;
end $$;

drop trigger if exists invoice_items_recompute on public.invoice_items;
create trigger invoice_items_recompute
  after insert or update or delete on public.invoice_items
  for each row execute function public.trg_recompute_invoice();

drop trigger if exists invoice_payments_recompute on public.invoice_payments;
create trigger invoice_payments_recompute
  after insert or update or delete on public.invoice_payments
  for each row execute function public.trg_recompute_invoice();

-- ---------------------------------------------------------
-- 11) recompute_usage_report_totals
-- ---------------------------------------------------------
create or replace function public.recompute_usage_report_totals(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_qty numeric(20,4);
  v_amt numeric(20,2);
  v_tr  numeric(20,2);
begin
  select
    coalesce(sum(qty_usage),0),
    coalesce(sum(amount),0),
    coalesce(sum(transport_amount),0)
  into v_qty, v_amt, v_tr
  from public.usage_report_lines
  where usage_report_id = p_report_id;

  update public.usage_reports
  set total_qty = v_qty,
      total_amount = v_amt,
      total_transport = v_tr,
      updated_at = now()
  where id = p_report_id;
end $$;

create or replace function public.trg_recompute_usage_report()
returns trigger language plpgsql as $$
declare v_id uuid;
begin
  if (tg_op = 'DELETE') then v_id := old.usage_report_id;
  else v_id := new.usage_report_id; end if;
  perform public.recompute_usage_report_totals(v_id);
  if (tg_op = 'DELETE') then return old; else return new; end if;
end $$;

drop trigger if exists usage_report_lines_recompute on public.usage_report_lines;
create trigger usage_report_lines_recompute
  after insert or update or delete on public.usage_report_lines
  for each row execute function public.trg_recompute_usage_report();

-- ---------------------------------------------------------
-- 12) Trigger: stok keluar saat usage APPROVED (Consignment)
-- ---------------------------------------------------------
create or replace function public.trg_usage_report_stock_out()
returns trigger language plpgsql as $$
declare v_line record;
begin
  if (new.status = 'APPROVED' and (old.status is null or old.status <> 'APPROVED')) then
    if new.report_type = 'CONSIGNMENT_USAGE' then
      for v_line in
        select * from public.usage_report_lines where usage_report_id = new.id
      loop
        insert into public.stock_movements (
          project_id, project_code, site_id, product_id,
          movement_type, qty, uom,
          reference_type, reference_id, movement_date,
          created_by
        ) values (
          new.project_id, new.project_code, new.site_id, v_line.product_id,
          'OUT_USAGE', -v_line.qty_usage, v_line.uom,
          'USAGE_REPORT', new.id, new.period_end,
          new.approved_by
        );
      end loop;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists usage_reports_stock_out on public.usage_reports;
create trigger usage_reports_stock_out
  after update on public.usage_reports
  for each row execute function public.trg_usage_report_stock_out();

-- ---------------------------------------------------------
-- 13) Trigger: stok masuk saat shipment CONFIRMED (Consignment)
-- ---------------------------------------------------------
create or replace function public.trg_shipment_stock_in()
returns trigger language plpgsql as $$
declare
  v_order record;
  v_item record;
begin
  if (new.status = 'CONFIRMED' and (old.status is null or old.status <> 'CONFIRMED')) then
    select * into v_order from public.orders where id = new.order_id;
    if v_order.business_model = 'Consignment' then
      for v_item in
        select * from public.shipment_items where shipment_id = new.id
      loop
        insert into public.stock_movements (
          project_id, project_code, site_id, product_id,
          movement_type, qty, uom,
          reference_type, reference_id, movement_date,
          created_by
        ) values (
          v_order.project_id, v_order.project_code, v_order.site_id, v_item.product_id,
          'IN_SHIPMENT', v_item.qty, v_item.uom,
          'SHIPMENT', new.id, new.shipment_date,
          new.created_by
        );
      end loop;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists shipments_stock_in on public.shipments;
create trigger shipments_stock_in
  after update on public.shipments
  for each row execute function public.trg_shipment_stock_in();

-- ---------------------------------------------------------
-- 14) VIEW: stock_balances
-- ---------------------------------------------------------
create or replace view public.stock_balances as
select
  project_id,
  project_code,
  site_id,
  product_id,
  sum(qty) as qty_on_hand,
  max(movement_date) as last_movement
from public.stock_movements
group by project_id, project_code, site_id, product_id;

-- ---------------------------------------------------------
-- 15) VIEW: invoice_aging (rebuild)
-- ---------------------------------------------------------
drop view if exists public.invoice_aging;
create view public.invoice_aging as
select
  i.id,
  i.invoice_number,
  i.invoice_ref,
  i.order_id,
  i.customer_id,
  c.name as customer_name,
  i.status,
  i.billing_model,
  i.invoice_trigger,
  i.payment_method,
  i.period_start,
  i.period_end,
  i.period_type,
  i.invoice_date,
  i.due_date,
  i.currency,
  i.amount_with_tax,
  i.amount_idr,
  i.paid_amount,
  i.pph23_amount,
  (i.amount_with_tax - i.paid_amount) as outstanding,
  case
    when i.status in ('PAID','CANCELLED','DRAFT') then null
    when i.due_date is null then null
    when i.due_date >= current_date then 0
    else (current_date - i.due_date)
  end as days_overdue,
  case
    when i.status in ('PAID','CANCELLED','DRAFT') then 'N/A'
    when i.due_date is null or i.due_date >= current_date then 'CURRENT'
    when (current_date - i.due_date) <= 30 then '1-30'
    when (current_date - i.due_date) <= 60 then '31-60'
    when (current_date - i.due_date) <= 90 then '61-90'
    else '90+'
  end as aging_bucket
from invoices i
left join customers c on c.id = i.customer_id;

-- ---------------------------------------------------------
-- 16) VIEW: project_summary (untuk grouping multi-order)
-- ---------------------------------------------------------
create or replace view public.project_summary as
select
  o.project_code,
  o.project_name,
  count(distinct o.id) as order_count,
  count(distinct o.customer_id) as customer_count,
  sum(case when o.order_type = 'MATERIAL' then o.selling_value else 0 end) as material_revenue,
  sum(case when o.order_type in ('SERVICE_FEE','SERVICE_BACKCHARGE')
           then o.selling_value else 0 end) as service_revenue,
  sum(o.selling_value) as total_revenue,
  sum(o.total_direct_cost) as total_cost,
  sum(o.margin) as total_margin,
  sum(o.ppn_output) as total_ppn_output,
  sum(o.pph23_amount) as total_pph23,
  sum(o.margin_after_tax) as total_margin_after_tax,
  min(o.created_at) as first_order_at,
  max(o.created_at) as last_order_at
from orders o
where o.project_code is not null
group by o.project_code, o.project_name;

-- ---------------------------------------------------------
-- 17) updated_at
-- ---------------------------------------------------------
drop trigger if exists usage_reports_touch on public.usage_reports;
create trigger usage_reports_touch before update on public.usage_reports
  for each row execute function public.touch_updated_at();