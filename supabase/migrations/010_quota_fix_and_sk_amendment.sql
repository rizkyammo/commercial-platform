-- =========================================================
-- 010_quota_fix_and_sk_amendment.sql
-- =========================================================

-- ---------------------------------------------------------
-- FIX #1: realize_quota_for_shipment harus emit PO_RELEASE
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
begin
  select order_id into v_order_id from shipments where id = p_shipment_id;
  if v_order_id is null then
    return jsonb_build_object('success', false, 'error', 'SHIPMENT_NOT_FOUND');
  end if;

  for v_item in (
    select product_id, qty from shipment_items where shipment_id = p_shipment_id
  ) loop
    select ql.id into v_line_id
    from kemhan_quota_lines ql
    join orders o on o.sk_id = ql.authorization_id
    where o.id = v_order_id and ql.product_id = v_item.product_id;

    if v_line_id is not null then
      -- idempotency: skip if already realized for this shipment
      if exists (
        select 1 from kemhan_quota_ledger
        where shipment_id = p_shipment_id
          and quota_line_id = v_line_id
          and transaction_type = 'DISTRIBUTION_REALIZATION'
      ) then
        continue;
      end if;

      -- 1) Release commitment portion
      insert into kemhan_quota_ledger (
        quota_line_id, transaction_type, qty, order_id, shipment_id, actor_user_id, reason
      ) values (
        v_line_id, 'PO_RELEASE', v_item.qty, v_order_id, p_shipment_id, p_actor,
        'Release commitment on shipment confirm'
      );

      -- 2) Realize quota
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
-- FIX #2: release_order_quota hanya release SISA commitment
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
  -- remaining commitment = -sum(PO_COMMITMENT) + sum(PO_RELEASE)
  for v_row in (
    select
      quota_line_id,
      coalesce(-sum(case when transaction_type = 'PO_COMMITMENT' then qty else 0 end), 0)
      + coalesce(sum(case when transaction_type = 'PO_RELEASE' then qty else 0 end), 0)
      as remaining
    from kemhan_quota_ledger
    where order_id = p_order_id
    group by quota_line_id
  ) loop
    if v_row.remaining > 0 then
      insert into kemhan_quota_ledger (
        quota_line_id, transaction_type, qty, order_id, actor_user_id, reason
      ) values (
        v_row.quota_line_id, 'PO_RELEASE', v_row.remaining, p_order_id, p_actor, p_reason
      );
      v_total_released := v_total_released + v_row.remaining;
    end if;
  end loop;
  return jsonb_build_object('success', true, 'released', v_total_released);
end;
$$;

grant execute on function public.release_order_quota(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------
-- FEATURE: SK Amendment (copy SK + quota lines)
-- ---------------------------------------------------------
create or replace function public.create_sk_amendment(
  p_source_sk_id uuid,
  p_actor uuid,
  p_new_sk_number text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_new_id uuid;
  v_source record;
  v_line record;
  v_new_line_id uuid;
begin
  select * into v_source from kemhan_authorizations where id = p_source_sk_id;
  if v_source.id is null then
    raise exception 'Source SK not found';
  end if;

  -- Create new SK (DRAFT), inheriting fields
  insert into kemhan_authorizations (
    sk_number, issuing_authority, issue_date, effective_date, expiry_date,
    scope, document_ref, notes, status,
    supersedes_id, created_by, updated_by
  ) values (
    p_new_sk_number,
    v_source.issuing_authority,
    current_date,
    v_source.effective_date,
    v_source.expiry_date,
    v_source.scope,
    v_source.document_ref,
    'Amendment of ' || v_source.sk_number,
    'DRAFT',
    p_source_sk_id,
    p_actor,
    p_actor
  )
  returning id into v_new_id;

  -- Copy quota lines + initial ALLOCATION ledger
  for v_line in (
    select * from kemhan_quota_lines where authorization_id = p_source_sk_id
  ) loop
    insert into kemhan_quota_lines (
      authorization_id, product_id, allocation_qty, uom, notes,
      created_by, updated_by
    ) values (
      v_new_id, v_line.product_id, v_line.allocation_qty, v_line.uom,
      'Copied from ' || v_source.sk_number,
      p_actor, p_actor
    )
    returning id into v_new_line_id;

    insert into kemhan_quota_ledger (
      quota_line_id, transaction_type, qty, actor_user_id, reason
    ) values (
      v_new_line_id, 'ALLOCATION', v_line.allocation_qty, p_actor,
      'Initial allocation (amendment from ' || v_source.sk_number || ')'
    );

    -- Copy scope
    insert into kemhan_authorization_scopes (authorization_id, product_id)
    values (v_new_id, v_line.product_id)
    on conflict do nothing;
  end loop;

  return v_new_id;
end;
$$;

grant execute on function public.create_sk_amendment(uuid, uuid, text) to authenticated;