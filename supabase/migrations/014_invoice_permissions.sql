-- =========================================================
-- 014_invoice_permissions.sql
-- Dedicated permissions untuk invoicing
-- =========================================================

-- 1) Insert permissions baru
insert into public.permissions (code, description) values
  ('INVOICE_VIEW',   'View invoices'),
  ('INVOICE_CREATE', 'Create and edit invoices'),
  ('INVOICE_ISSUE',  'Issue invoice (DRAFT → ISSUED)'),
  ('INVOICE_PAYMENT','Record payment for invoice'),
  ('INVOICE_CANCEL', 'Cancel invoice'),
  ('INVOICE_MANAGE', 'Full invoicing management')
on conflict (code) do nothing;

-- 2) Grant ke roles
do $$
declare
  v_staff uuid;
  v_sup uuid;
  v_mgr uuid;
  v_admin uuid;
  v_viewer uuid;
begin
  select id into v_staff from roles where name = 'commercial_staff';
  select id into v_sup from roles where name = 'commercial_supervisor';
  select id into v_mgr from roles where name = 'commercial_manager';
  select id into v_admin from roles where name = 'system_admin';
  select id into v_viewer from roles where name = 'management_viewer';

  -- Staff: view + create + payment
  insert into role_permissions (role_id, permission_id)
  select v_staff, id from permissions
  where code in ('INVOICE_VIEW','INVOICE_CREATE','INVOICE_PAYMENT')
  on conflict do nothing;

  -- Supervisor: view + create + payment + issue
  insert into role_permissions (role_id, permission_id)
  select v_sup, id from permissions
  where code in ('INVOICE_VIEW','INVOICE_CREATE','INVOICE_PAYMENT','INVOICE_ISSUE','INVOICE_CANCEL')
  on conflict do nothing;

  -- Manager: full access
  insert into role_permissions (role_id, permission_id)
  select v_mgr, id from permissions
  where code in ('INVOICE_VIEW','INVOICE_CREATE','INVOICE_ISSUE','INVOICE_PAYMENT','INVOICE_CANCEL','INVOICE_MANAGE')
  on conflict do nothing;

  -- Viewer: read only
  insert into role_permissions (role_id, permission_id)
  select v_viewer, id from permissions
  where code in ('INVOICE_VIEW')
  on conflict do nothing;

  -- Admin: everything
  insert into role_permissions (role_id, permission_id)
  select v_admin, id from permissions
  where code in ('INVOICE_VIEW','INVOICE_CREATE','INVOICE_ISSUE','INVOICE_PAYMENT','INVOICE_CANCEL','INVOICE_MANAGE')
  on conflict do nothing;
end $$;

-- 3) Update RLS invoices — pakai INVOICE_CREATE instead of ORDER_APPROVE
drop policy if exists "invoices_insert" on public.invoices;
create policy "invoices_insert" on public.invoices for insert
  with check (public.has_permission('INVOICE_CREATE'));

drop policy if exists "invoices_update" on public.invoices;
create policy "invoices_update" on public.invoices for update
  using (
    public.has_permission('INVOICE_CREATE')
    or public.has_permission('INVOICE_ISSUE')
    or public.has_permission('INVOICE_PAYMENT')
    or public.has_permission('INVOICE_CANCEL')
  );

drop policy if exists "invoices_delete" on public.invoices;
create policy "invoices_delete" on public.invoices for delete
  using (public.has_permission('INVOICE_CREATE'));

drop policy if exists "invoice_items_write" on public.invoice_items;
create policy "invoice_items_write" on public.invoice_items for all
  using (public.has_permission('INVOICE_CREATE'));

drop policy if exists "invoice_payments_write" on public.invoice_payments;
create policy "invoice_payments_write" on public.invoice_payments for all
  using (public.has_permission('INVOICE_PAYMENT'));

-- 4) Verifikasi
select
  r.name as role,
  p.code as permission
from roles r
join role_permissions rp on rp.role_id = r.id
join permissions p on p.id = rp.permission_id
where p.code like 'INVOICE_%'
order by r.name, p.code;