-- =========================================================
-- 007_amendment.sql — Amendment metadata + workflow fix
-- =========================================================

-- Track amendment count & origin
alter table public.orders
  add column if not exists amendment_count int not null default 0,
  add column if not exists last_amendment_from_status text,
  add column if not exists last_amendment_at timestamptz,
  add column if not exists last_amendment_by uuid;

-- Index untuk query cepat order yang sedang dalam amendment
create index if not exists orders_amendment_idx
  on public.orders (amendment_count) where amendment_count > 0;

-- =========================================================
-- FUNCTION: Apply approved amendment to order
-- Security definer: bypass RLS (dipanggil dari server action)
-- =========================================================
create or replace function public.apply_amendment_approval(
  p_order_id uuid,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_status text;
begin
  select status into v_current_status
  from public.orders
  where id = p_order_id;

  if v_current_status is null then
    raise exception 'Order not found: %', p_order_id;
  end if;

  -- Set ke DRAFT agar editable, simpan status sebelumnya
  update public.orders
  set
    status = 'DRAFT',
    last_amendment_from_status = v_current_status,
    last_amendment_at = now(),
    last_amendment_by = p_actor,
    amendment_count = amendment_count + 1,
    updated_at = now(),
    updated_by = p_actor
  where id = p_order_id;
end;
$$;

grant execute on function public.apply_amendment_approval(uuid, uuid) to authenticated;