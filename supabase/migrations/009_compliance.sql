-- =========================================================
-- 009_compliance.sql — Phase 5: SK Kemhan + Quota Ledger
-- =========================================================

-- ---------------------------------------------------------
-- SK KEMHAN AUTHORIZATIONS
-- ---------------------------------------------------------
create table if not exists public.kemhan_authorizations (
  id uuid primary key default gen_random_uuid(),
  sk_number text unique not null,
  issuing_authority text not null default 'Kementerian Pertahanan RI',
  issue_date date,
  effective_date date,
  expiry_date date,
  status text not null default 'DRAFT', -- DRAFT|UNDER_REVIEW|APPROVED|ACTIVE|EXPIRED|EXHAUSTED|SUPERSEDED|REVOKED
  scope text,
  document_ref text,
  supersedes_id uuid references public.kemhan_authorizations(id),
  superseded_by_id uuid references public.kemhan_authorizations(id),
  activated_at timestamptz,
  activated_by uuid,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create index if not exists sk_status_idx on public.kemhan_authorizations (status);
create index if not exists sk_expiry_idx on public.kemhan_authorizations (expiry_date);

-- ---------------------------------------------------------
-- AUTHORIZATION PRODUCT SCOPES
-- ---------------------------------------------------------
create table if not exists public.kemhan_authorization_scopes (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.kemhan_authorizations(id) on delete cascade,
  product_id uuid not null references public.products(id),
  notes text,
  created_at timestamptz not null default now(),
  unique (authorization_id, product_id)
);
create index if not exists scope_sk_idx on public.kemhan_authorization_scopes (authorization_id);

-- ---------------------------------------------------------
-- QUOTA LINES (per product per SK)
-- ---------------------------------------------------------
create table if not exists public.kemhan_quota_lines (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references public.kemhan_authorizations(id) on delete cascade,
  product_id uuid not null references public.products(id),
  allocation_qty numeric(20,4) not null default 0,
  uom text not null default 'MT',
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (authorization_id, product_id)
);
create index if not exists quota_line_sk_idx on public.kemhan_quota_lines (authorization_id);
create index if not exists quota_line_product_idx on public.kemhan_quota_lines (product_id);

-- ---------------------------------------------------------
-- QUOTA LEDGER (append-only)
-- ---------------------------------------------------------
create table if not exists public.kemhan_quota_ledger (
  id uuid primary key default gen_random_uuid(),
  quota_line_id uuid not null references public.kemhan_quota_lines(id) on delete cascade,
  transaction_type text not null,
  -- ALLOCATION | PO_COMMITMENT | PO_RELEASE | DISTRIBUTION_REALIZATION | REVERSAL | ADJUSTMENT
  qty numeric(20,4) not null, -- signed: + increase available, - decrease
  order_id uuid references public.orders(id),
  shipment_id uuid references public.shipments(id),
  reason text,
  metadata jsonb default '{}'::jsonb,
  actor_user_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists ledger_line_idx on public.kemhan_quota_ledger (quota_line_id, created_at desc);
create index if not exists ledger_order_idx on public.kemhan_quota_ledger (order_id);

-- ---------------------------------------------------------
-- COMPUTE HELPERS
-- ---------------------------------------------------------
-- Available = sum of signed qty in ledger
create or replace function public.get_quota_summary(p_line_id uuid)
returns table(allocated numeric, committed numeric, realized numeric, available numeric)
language sql stable as $$
  select
    coalesce(sum(case when transaction_type in ('ALLOCATION','ADJUSTMENT','REVERSAL') then qty else 0 end), 0) as allocated,
    coalesce(-sum(case when transaction_type = 'PO_COMMITMENT' then qty else 0 end)
           + sum(case when transaction_type = 'PO_RELEASE' then qty else 0 end), 0) as committed,
    coalesce(-sum(case when transaction_type = 'DISTRIBUTION_REALIZATION' then qty else 0 end), 0) as realized,
    coalesce(sum(qty), 0) as available
  from public.kemhan_quota_ledger
  where quota_line_id = p_line_id;
$$;

-- ---------------------------------------------------------
-- ORDERS INTEGRATION
-- ---------------------------------------------------------
alter table public.orders
  add column if not exists issued_at timestamptz,
  add column if not exists issued_by uuid;

-- ---------------------------------------------------------
-- RPC: Issue order with quota reservation (atomic)
-- ---------------------------------------------------------
create or replace function public.issue_order_with_quota(
  p_order_id uuid,
  p_actor uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sk_id uuid;
  v_sk_status text;
  v_expiry date;
  v_item record;
  v_line_id uuid;
  v_avail numeric;
  v_order_status text;
begin
  -- 1) Validasi order
  select status, sk_id into v_order_status, v_sk_id
  from orders where id = p_order_id for update;

  if v_order_status is null then
    return jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  end if;
  if v_order_status not in ('APPROVED', 'RETURNED') then
    return jsonb_build_object('success', false, 'error', 'ORDER_INVALID_STATE', 'status', v_order_status);
  end if;

  -- 2) Ambil SK aktif (dari order, atau auto-pick latest active)
  if v_sk_id is null then
    select id, status, expiry_date into v_sk_id, v_sk_status, v_expiry
    from kemhan_authorizations
    where status = 'ACTIVE'
    order by effective_date desc nulls last, created_at desc
    limit 1;
  else
    select status, expiry_date into v_sk_status, v_expiry
    from kemhan_authorizations where id = v_sk_id;
  end if;

  if v_sk_id is null then
    return jsonb_build_object('success', false, 'error', 'SK_NOT_FOUND');
  end if;
  if v_sk_status <> 'ACTIVE' then
    return jsonb_build_object('success', false, 'error', 'SK_NOT_ACTIVE', 'status', v_sk_status);
  end if;
  if v_expiry is not null and v_expiry < current_date then
    return jsonb_build_object('success', false, 'error', 'SK_EXPIRED', 'expiry', v_expiry);
  end if;

  -- 3) Loop item order, lock quota line, check, insert ledger
  for v_item in (
    select product_id, qty from order_items where order_id = p_order_id order by product_id
  ) loop
    select id into v_line_id
    from kemhan_quota_lines
    where authorization_id = v_sk_id and product_id = v_item.product_id
    for update;

    if v_line_id is null then
      return jsonb_build_object(
        'success', false, 'error', 'MATERIAL_NOT_AUTHORIZED',
        'product_id', v_item.product_id
      );
    end if;

    select coalesce(sum(qty), 0) into v_avail
    from kemhan_quota_ledger where quota_line_id = v_line_id;

    if v_avail < v_item.qty then
      return jsonb_build_object(
        'success', false, 'error', 'QUOTA_INSUFFICIENT',
        'product_id', v_item.product_id,
        'available', v_avail,
        'requested', v_item.qty
      );
    end if;

    insert into kemhan_quota_ledger (
      quota_line_id, transaction_type, qty, order_id, actor_user_id, reason
    ) values (
      v_line_id, 'PO_COMMITMENT', -v_item.qty, p_order_id, p_actor,
      'Reserved on order issue'
    );
  end loop;

  -- 4) Update order
  update orders
  set status = 'ISSUED',
      sk_id = v_sk_id,
      issued_at = now(),
      issued_by = p_actor,
      updated_by = p_actor,
      updated_at = now()
  where id = p_order_id;

  insert into order_status_history (order_id, from_status, to_status, action, actor_user_id)
  values (p_order_id, v_order_status, 'ISSUED', 'ISSUE', p_actor);

  return jsonb_build_object('success', true, 'sk_id', v_sk_id);
end;
$$;

grant execute on function public.issue_order_with_quota(uuid, uuid) to authenticated;

-- ---------------------------------------------------------
-- RPC: Release remaining commitment on cancel
-- ---------------------------------------------------------
create or replace function public.release_order_quota(
  p_order_id uuid,
  p_actor uuid,
  p_reason text default 'Order cancelled'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row record;
  v_total_released numeric := 0;
begin
  -- For each quota_line where there's still net commitment for this order
  for v_row in (
    select quota_line_id,
           sum(qty) as net_committed
    from kemhan_quota_ledger
    where order_id = p_order_id
    group by quota_line_id
  ) loop
    -- net_committed is negative for outstanding commitment
    if v_row.net_committed < 0 then
      insert into kemhan_quota_ledger (
        quota_line_id, transaction_type, qty, order_id, actor_user_id, reason
      ) values (
        v_row.quota_line_id, 'PO_RELEASE', -v_row.net_committed, p_order_id, p_actor, p_reason
      );
      v_total_released := v_total_released + (-v_row.net_committed);
    end if;
  end loop;
  return jsonb_build_object('success', true, 'released', v_total_released);
end;
$$;
grant execute on function public.release_order_quota(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------
-- RPC: Realize quota on shipment confirm
-- ---------------------------------------------------------
create or replace function public.realize_quota_for_shipment(
  p_shipment_id uuid,
  p_actor uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order_id uuid;
  v_item record;
  v_line_id uuid;
  v_avail_commit numeric;
begin
  select order_id into v_order_id from shipments where id = p_shipment_id;
  if v_order_id is null then
    return jsonb_build_object('success', false, 'error', 'SHIPMENT_NOT_FOUND');
  end if;

  for v_item in (
    select product_id, qty from shipment_items where shipment_id = p_shipment_id
  ) loop
    -- find quota line for this product from order's SK
    select ql.id into v_line_id
    from kemhan_quota_lines ql
    join orders o on o.sk_id = ql.authorization_id
    where o.id = v_order_id and ql.product_id = v_item.product_id;

    if v_line_id is not null then
      -- Move from committed to realized: insert DISTRIBUTION_REALIZATION (-qty)
      insert into kemhan_quota_ledger (
        quota_line_id, transaction_type, qty, order_id, shipment_id, actor_user_id, reason
      ) values (
        v_line_id, 'DISTRIBUTION_REALIZATION', -v_item.qty, v_order_id, p_shipment_id, p_actor,
        'Realized on shipment confirm'
      );
    end if;
  end loop;

  return jsonb_build_object('success', true);
end;
$$;
grant execute on function public.realize_quota_for_shipment(uuid, uuid) to authenticated;

-- ---------------------------------------------------------
-- TRIGGER: auto-set EXPIRED when past expiry_date
-- ---------------------------------------------------------
create or replace function public.check_sk_expiry()
returns void language plpgsql as $$
begin
  update kemhan_authorizations
  set status = 'EXPIRED', updated_at = now()
  where status = 'ACTIVE' and expiry_date is not null and expiry_date < current_date;
end;
$$;

-- ---------------------------------------------------------
-- AUTO updated_at
-- ---------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['kemhan_authorizations','kemhan_quota_lines']
  loop
    execute format('drop trigger if exists %1$s_touch on public.%1$s;', t);
    execute format('create trigger %1$s_touch before update on public.%1$s for each row execute function public.touch_updated_at();', t);
  end loop;
end $$;

-- =========================================================
-- RLS
-- =========================================================
alter table public.kemhan_authorizations enable row level security;
alter table public.kemhan_authorization_scopes enable row level security;
alter table public.kemhan_quota_lines enable row level security;
alter table public.kemhan_quota_ledger enable row level security;

-- READ
do $$
declare t text;
begin
  foreach t in array array['kemhan_authorizations','kemhan_authorization_scopes','kemhan_quota_lines','kemhan_quota_ledger']
  loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s;', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (auth.uid() is not null);', t);
  end loop;
end $$;

-- SK write: SK_CREATE / SK_SUBMIT / SK_ACTIVATE
drop policy if exists "sk_insert" on public.kemhan_authorizations;
create policy "sk_insert" on public.kemhan_authorizations for insert
  with check (public.has_permission('SK_CREATE'));
drop policy if exists "sk_update" on public.kemhan_authorizations;
create policy "sk_update" on public.kemhan_authorizations for update
  using (public.has_permission('SK_CREATE') or public.has_permission('SK_SUBMIT') or public.has_permission('SK_ACTIVATE'));
drop policy if exists "sk_delete" on public.kemhan_authorizations;
create policy "sk_delete" on public.kemhan_authorizations for delete
  using (public.has_permission('SK_CREATE') and status = 'DRAFT');

-- Scopes
drop policy if exists "scope_write" on public.kemhan_authorization_scopes;
create policy "scope_write" on public.kemhan_authorization_scopes for all
  using (public.has_permission('SK_CREATE'));

-- Quota lines
drop policy if exists "quota_line_write" on public.kemhan_quota_lines;
create policy "quota_line_write" on public.kemhan_quota_lines for all
  using (public.has_permission('SK_CREATE'));

-- Ledger: insert only via SECURITY DEFINER RPC (or with QUOTA_ADJUST_REQUEST)
drop policy if exists "ledger_insert" on public.kemhan_quota_ledger;
create policy "ledger_insert" on public.kemhan_quota_ledger for insert
  with check (public.has_permission('QUOTA_ADJUST_REQUEST') or public.has_permission('SK_ACTIVATE'));