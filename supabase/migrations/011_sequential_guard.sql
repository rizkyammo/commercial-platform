-- =========================================================
-- 011_sequential_guard.sql
-- Fix compliance_status auto-set + sequential stage guards
-- =========================================================

-- ---------------------------------------------------------
-- FIX #1: recompute_order_stages derive compliance dari order.status
-- ---------------------------------------------------------
create or replace function public.recompute_order_stages(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_comp_status text := 'NOT_STARTED';
  v_proc_status text := 'NOT_STARTED';
  v_ship_status text := 'NOT_STARTED';
  v_deliv_status text := 'NOT_STARTED';
  v_bast_status text := 'NOT_STARTED';
  v_current_stage text := 'PO';
  v_order_status text;
begin
  -- Compliance = COMPLETED kalau order sudah ISSUED atau lebih
  select status into v_order_status from orders where id = p_order_id;
  if v_order_status in ('ISSUED','IN_PROGRESS','PARTIALLY_FULFILLED','FULFILLED','CLOSED') then
    v_comp_status := 'COMPLETED';
  end if;

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

  -- Current stage (sequential)
  if v_bast_status = 'COMPLETED' then v_current_stage := 'COMPLETE';
  elsif v_deliv_status = 'COMPLETED' then v_current_stage := 'BAST';
  elsif v_ship_status = 'COMPLETED' then v_current_stage := 'DELIVERY';
  elsif v_proc_status = 'COMPLETED' then v_current_stage := 'SHIPMENT';
  elsif v_comp_status = 'COMPLETED' then v_current_stage := 'PROCUREMENT';
  else v_current_stage := 'PO';
  end if;

  update public.orders
  set compliance_status = v_comp_status,
      procurement_status = v_proc_status,
      shipment_status = v_ship_status,
      delivery_status = v_deliv_status,
      bast_status = v_bast_status,
      current_stage = v_current_stage,
      updated_at = now()
  where id = p_order_id;
end $$;

-- ---------------------------------------------------------
-- FIX #2: issue_order_with_quota set compliance_status + current_stage
-- ---------------------------------------------------------
create or replace function public.issue_order_with_quota(
  p_order_id uuid,
  p_actor uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_sk_id uuid;
  v_sk_status text;
  v_expiry date;
  v_item record;
  v_line_id uuid;
  v_avail numeric;
  v_order_status text;
begin
  select status, sk_id into v_order_status, v_sk_id
  from orders where id = p_order_id for update;

  if v_order_status is null then
    return jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
  end if;
  if v_order_status not in ('APPROVED', 'RETURNED') then
    return jsonb_build_object('success', false, 'error', 'ORDER_INVALID_STATE', 'status', v_order_status);
  end if;

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

  for v_item in (
    select product_id, qty from order_items where order_id = p_order_id order by product_id
  ) loop
    select id into v_line_id
    from kemhan_quota_lines
    where authorization_id = v_sk_id and product_id = v_item.product_id
    for update;

    if v_line_id is null then
      return jsonb_build_object('success', false, 'error', 'MATERIAL_NOT_AUTHORIZED', 'product_id', v_item.product_id);
    end if;

    select coalesce(sum(qty), 0) into v_avail
    from kemhan_quota_ledger where quota_line_id = v_line_id;

    if v_avail < v_item.qty then
      return jsonb_build_object('success', false, 'error', 'QUOTA_INSUFFICIENT', 'product_id', v_item.product_id, 'available', v_avail, 'requested', v_item.qty);
    end if;

    insert into kemhan_quota_ledger (
      quota_line_id, transaction_type, qty, order_id, actor_user_id, reason
    ) values (
      v_line_id, 'PO_COMMITMENT', -v_item.qty, p_order_id, p_actor, 'Reserved on order issue'
    );
  end loop;

  update orders
  set status = 'ISSUED',
      sk_id = v_sk_id,
      issued_at = now(),
      issued_by = p_actor,
      compliance_status = 'COMPLETED',
      current_stage = 'PROCUREMENT',
      updated_by = p_actor,
      updated_at = now()
  where id = p_order_id;

  insert into order_status_history (order_id, from_status, to_status, action, actor_user_id)
  values (p_order_id, v_order_status, 'ISSUED', 'ISSUE', p_actor);

  return jsonb_build_object('success', true, 'sk_id', v_sk_id);
end;
$$;

-- ---------------------------------------------------------
-- FIX #3: Backfill compliance_status untuk order lama
-- ---------------------------------------------------------
update public.orders
set compliance_status = 'COMPLETED'
where status in ('ISSUED', 'IN_PROGRESS', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CLOSED')
  and compliance_status = 'NOT_STARTED';