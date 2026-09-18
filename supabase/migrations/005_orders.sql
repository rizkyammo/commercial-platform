-- =========================================================
-- 005_orders.sql — Phase 3: Orders, Items, Approvals, Notifications
-- =========================================================

-- ---------------------------------------------------------
-- ORDER NUMBER SEQUENCE
-- ---------------------------------------------------------
create sequence if not exists public.order_number_seq start 1;

create or replace function public.generate_order_number()
returns text
language plpgsql
as $$
declare
  n int;
begin
  n := nextval('public.order_number_seq');
  return 'SO-' || to_char(now(), 'YYYYMM') || '-' || lpad(n::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------
-- ORDERS
-- ---------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null default public.generate_order_number(),
  customer_id uuid not null references public.customers(id),
  site_id uuid not null references public.sites(id),
  contract_id uuid not null references public.contracts(id),
  business_model text not null default 'Direct Sale',
  po_number text,
  po_date date,
  currency text not null default 'IDR',
  exchange_rate numeric(20,6) not null default 1,
  selling_value numeric(20,2) not null default 0,
  total_direct_cost numeric(20,2) not null default 0,
  margin numeric(20,2) not null default 0,
  status text not null default 'DRAFT',
  -- stage flags (Phase 4+ akan isi yang lain)
  po_status text not null default 'DRAFT',
  compliance_status text not null default 'NOT_STARTED',
  procurement_status text not null default 'NOT_STARTED',
  shipment_status text not null default 'NOT_STARTED',
  delivery_status text not null default 'NOT_STARTED',
  bast_status text not null default 'NOT_STARTED',
  current_stage text not null default 'PO',
  -- compliance reference (Phase 5)
  sk_id uuid,
  quota_line_id uuid,
  -- meta
  completion_pct int not null default 0,
  remarks text,
  submitted_at timestamptz,
  submitted_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  returned_at timestamptz,
  returned_by uuid,
  return_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid,
  cancel_reason text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_site_idx on public.orders (site_id);
create index if not exists orders_contract_idx on public.orders (contract_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_po_number_idx on public.orders (po_number);

-- ---------------------------------------------------------
-- ORDER ITEMS
-- ---------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  description text,
  qty numeric(20,4) not null default 0,
  uom text not null default 'MT',
  unit_price numeric(20,2) not null default 0,
  currency text not null default 'IDR',
  exchange_rate numeric(20,6) not null default 1,
  unit_price_idr numeric(20,2) not null default 0,
  line_value numeric(20,2) not null default 0,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- ---------------------------------------------------------
-- ORDER STATUS HISTORY
-- ---------------------------------------------------------
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  action text not null,
  reason text,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists order_status_history_order_idx on public.order_status_history (order_id, created_at desc);

-- ---------------------------------------------------------
-- APPROVAL REQUESTS (untuk amendment & cancellation)
-- ---------------------------------------------------------
create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  type text not null, -- AMENDMENT | CANCELLATION | EXCEPTION
  status text not null default 'PENDING', -- PENDING | APPROVED | REJECTED | CANCELLED
  requested_by uuid not null,
  requested_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists approval_requests_order_idx on public.approval_requests (order_id);

-- ---------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  severity text not null default 'INFO',
  title text not null,
  message text,
  link text,
  metadata jsonb default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

-- ---------------------------------------------------------
-- RECOMPUTE ORDER TOTALS ON ITEM CHANGES
-- ---------------------------------------------------------
create or replace function public.recompute_order_totals(p_order_id uuid)
returns void
language plpgsql
as $$
declare
  v_selling numeric(20,2);
  v_cost numeric(20,2);
begin
  select coalesce(sum(line_value), 0) into v_selling
  from public.order_items where order_id = p_order_id;

  select coalesce(total_direct_cost, 0) into v_cost
  from public.orders where id = p_order_id;

  update public.orders
  set selling_value = v_selling,
      margin = v_selling - v_cost,
      updated_at = now()
  where id = p_order_id;
end;
$$;

create or replace function public.order_items_after_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recompute_order_totals(old.order_id);
    return old;
  else
    perform public.recompute_order_totals(new.order_id);
    return new;
  end if;
end;
$$;

drop trigger if exists order_items_recompute on public.order_items;
create trigger order_items_recompute
  after insert or update or delete on public.order_items
  for each row execute function public.order_items_after_change();

-- ---------------------------------------------------------
-- AUTO updated_at on orders
-- ---------------------------------------------------------
drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------
-- RLS
-- ---------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.approval_requests enable row level security;
alter table public.notifications enable row level security;

-- Read: semua authenticated user boleh lihat orders
create policy "orders_read" on public.orders
  for select using (auth.uid() is not null);
create policy "order_items_read" on public.order_items
  for select using (auth.uid() is not null);
create policy "order_history_read" on public.order_status_history
  for select using (auth.uid() is not null);
create policy "approval_read" on public.approval_requests
  for select using (auth.uid() is not null);

-- Write orders: hanya yang punya ORDER_CREATE / ORDER_UPDATE_DRAFT
create policy "orders_insert" on public.orders
  for insert with check (
    public.has_permission('ORDER_CREATE')
  );
create policy "orders_update" on public.orders
  for update using (
    public.has_permission('ORDER_UPDATE_DRAFT')
    or public.has_permission('ORDER_SUBMIT')
    or public.has_permission('ORDER_REVIEW')
    or public.has_permission('ORDER_APPROVE')
    or public.has_permission('ORDER_CANCEL_APPROVE')
    or public.has_permission('ORDER_AMEND_APPROVE')
  );

-- Order items
create policy "order_items_insert" on public.order_items
  for insert with check (
    public.has_permission('ORDER_CREATE') or public.has_permission('ORDER_UPDATE_DRAFT')
  );
create policy "order_items_update" on public.order_items
  for update using (
    public.has_permission('ORDER_UPDATE_DRAFT')
  );
create policy "order_items_delete" on public.order_items
  for delete using (
    public.has_permission('ORDER_UPDATE_DRAFT')
  );

-- History & approvals: append only via server (service role / definer function)
create policy "order_history_insert" on public.order_status_history
  for insert with check (auth.uid() is not null);

create policy "approval_insert" on public.approval_requests
  for insert with check (auth.uid() is not null);
create policy "approval_update" on public.approval_requests
  for update using (
    public.has_permission('ORDER_AMEND_APPROVE') or public.has_permission('ORDER_CANCEL_APPROVE')
  );

-- Notifications: user hanya melihat miliknya
create policy "notifications_select_self" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_self" on public.notifications
  for update using (user_id = auth.uid());
create policy "notifications_insert_self" on public.notifications
  for insert with check (user_id = auth.uid());

-- =========================================================
-- HELPER: find user ids by role (untuk notifikasi)
-- =========================================================
create or replace function public.users_with_role(p_role text)
returns table(user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select ur.user_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  where r.name = p_role;
$$;