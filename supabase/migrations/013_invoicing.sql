-- =========================================================
-- 013_invoicing.sql — Invoice reference, payments, aging
-- =========================================================

create sequence if not exists public.invoice_number_seq start 1;

create or replace function public.generate_invoice_number() returns text
language plpgsql as $$
begin
  return 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0');
end $$;

-- ---------------------------------------------------------
-- INVOICES
-- ---------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null default public.generate_invoice_number(),
  invoice_ref text, -- nomor dari Finance / actual tax invoice
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.customers(id),

  invoice_type text not null default 'FULL',
  -- FULL | PER_SHIPMENT | MONTHLY_USAGE | MILESTONE | PROGRESSIVE | MANUAL

  invoice_date date not null default current_date,
  due_date date,
  payment_term_days int not null default 30,

  currency text not null default 'IDR',
  exchange_rate numeric(20,6) not null default 1,
  amount numeric(20,2) not null default 0,      -- DPP (sebelum PPN)
  tax_rate numeric(5,2) not null default 11,
  tax_amount numeric(20,2) not null default 0,
  amount_with_tax numeric(20,2) not null default 0,
  amount_idr numeric(20,2) not null default 0,

  paid_amount numeric(20,2) not null default 0,
  status text not null default 'DRAFT',
  -- DRAFT | ISSUED | SENT | PARTIAL_PAID | PAID | OVERDUE | CANCELLED

  issued_at timestamptz,
  issued_by uuid,
  sent_at timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,

  source_shipment_id uuid references public.shipments(id),
  source_bast_id uuid references public.basts(id),

  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists invoices_order_idx on public.invoices (order_id);
create index if not exists invoices_customer_idx on public.invoices (customer_id);
create index if not exists invoices_status_idx on public.invoices (status);
create index if not exists invoices_due_idx on public.invoices (due_date);

-- ---------------------------------------------------------
-- INVOICE ITEMS
-- ---------------------------------------------------------
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products(id),
  description text,
  qty numeric(20,4) not null default 0,
  uom text not null default 'MT',
  unit_price numeric(20,2) not null default 0,
  line_value numeric(20,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);

-- ---------------------------------------------------------
-- INVOICE PAYMENTS
-- ---------------------------------------------------------
create table if not exists public.invoice_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  payment_date date not null default current_date,
  amount numeric(20,2) not null default 0,
  currency text not null default 'IDR',
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists invoice_payments_invoice_idx on public.invoice_payments (invoice_id);

-- ---------------------------------------------------------
-- COMPUTE INVOICE TOTALS
-- ---------------------------------------------------------
create or replace function public.recompute_invoice_totals(p_invoice_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(20,2);
  v_tax_rate numeric(5,2);
  v_paid numeric(20,2);
  v_exchange numeric(20,6);
  v_currency text;
  v_due date;
  v_status text;
  v_tax numeric(20,2);
  v_total numeric(20,2);
  v_amount_idr numeric(20,2);
  v_new_status text;
begin
  select coalesce(sum(line_value),0) into v_amount
  from invoice_items where invoice_id = p_invoice_id;

  select tax_rate, exchange_rate, currency, due_date, status
  into v_tax_rate, v_exchange, v_currency, v_due, v_status
  from invoices where id = p_invoice_id;

  select coalesce(sum(amount),0) into v_paid
  from invoice_payments where invoice_id = p_invoice_id;

  v_tax := (v_amount * coalesce(v_tax_rate, 0)) / 100;
  v_total := v_amount + v_tax;
  v_amount_idr := v_total * coalesce(v_exchange, 1);

  -- Status auto-update
  v_new_status := v_status;
  if v_status not in ('DRAFT', 'CANCELLED') then
    if v_paid >= v_total and v_total > 0 then
      v_new_status := 'PAID';
    elsif v_paid > 0 then
      v_new_status := 'PARTIAL_PAID';
    elsif v_due is not null and v_due < current_date and v_status in ('ISSUED','SENT') then
      v_new_status := 'OVERDUE';
    end if;
  end if;

  update invoices
  set amount = v_amount,
      tax_amount = v_tax,
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
-- CONTRACT RULES: tambah field invoicing default
-- ---------------------------------------------------------
alter table public.contract_rules
  add column if not exists invoice_trigger text default null;

-- ---------------------------------------------------------
-- AUTO updated_at
-- ---------------------------------------------------------
drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.invoice_payments enable row level security;

drop policy if exists "invoices_read" on public.invoices;
create policy "invoices_read" on public.invoices
  for select using (auth.uid() is not null);

drop policy if exists "invoice_items_read" on public.invoice_items;
create policy "invoice_items_read" on public.invoice_items
  for select using (auth.uid() is not null);

drop policy if exists "invoice_payments_read" on public.invoice_payments;
create policy "invoice_payments_read" on public.invoice_payments
  for select using (auth.uid() is not null);

drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert" on public.invoices for insert
  with check (
    public.has_permission('ORDER_APPROVE')
    or public.has_permission('ORDER_UPDATE_DRAFT')
  );

drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices for update
  using (
    public.has_permission('ORDER_APPROVE')
    or public.has_permission('ORDER_UPDATE_DRAFT')
  );

drop policy if exists "invoice_items_write" on public.invoice_items;
create policy "invoice_items_write" on public.invoice_items for all
  using (public.has_permission('ORDER_APPROVE') or public.has_permission('ORDER_UPDATE_DRAFT'));

drop policy if exists "invoice_payments_write" on public.invoice_payments;
create policy "invoice_payments_write" on public.invoice_payments for all
  using (public.has_permission('ORDER_APPROVE') or public.has_permission('ORDER_UPDATE_DRAFT'));

-- ---------------------------------------------------------
-- HELPER VIEW: aging
-- ---------------------------------------------------------
create or replace view public.invoice_aging as
select
  i.id,
  i.invoice_number,
  i.invoice_ref,
  i.order_id,
  i.customer_id,
  c.name as customer_name,
  i.status,
  i.invoice_date,
  i.due_date,
  i.currency,
  i.amount_with_tax,
  i.amount_idr,
  i.paid_amount,
  (i.amount_with_tax - i.paid_amount) as outstanding,
  case
    when i.status in ('PAID', 'CANCELLED', 'DRAFT') then null
    when i.due_date is null then null
    when i.due_date >= current_date then 0
    else (current_date - i.due_date)
  end as days_overdue,
  case
    when i.status in ('PAID', 'CANCELLED', 'DRAFT') then 'N/A'
    when i.due_date is null or i.due_date >= current_date then 'CURRENT'
    when (current_date - i.due_date) <= 30 then '1-30'
    when (current_date - i.due_date) <= 60 then '31-60'
    when (current_date - i.due_date) <= 90 then '61-90'
    else '90+'
  end as aging_bucket
from invoices i
left join customers c on c.id = i.customer_id;