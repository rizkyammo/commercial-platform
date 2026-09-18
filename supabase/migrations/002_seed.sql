-- =========================================================
-- 002_seed.sql — Roles, Permissions, and Root Organisation
-- =========================================================

insert into public.organisations (name, code, type)
values ('Commercial', 'ORG-001', 'root')
on conflict (code) do nothing;

-- Roles
insert into public.roles (name, display_name, description) values
  ('commercial_staff', 'Commercial Staff', 'Operational commercial user'),
  ('commercial_supervisor', 'Commercial Supervisor', 'Reviewer of commercial transactions'),
  ('commercial_manager', 'Commercial Manager', 'Final commercial approver'),
  ('compliance_staff', 'Compliance Staff', 'Compliance & SK operator'),
  ('compliance_approver', 'Compliance Approver', 'SK activator & quota approver'),
  ('management_viewer', 'Management Viewer', 'Read-only management user'),
  ('system_admin', 'System Admin', 'Platform administrator')
on conflict (name) do nothing;

-- Permissions
insert into public.permissions (code, description) values
  ('ORDER_CREATE', 'Create order'),
  ('ORDER_UPDATE_DRAFT', 'Update draft'),
  ('ORDER_SUBMIT', 'Submit order'),
  ('ORDER_REVIEW', 'Review order'),
  ('ORDER_APPROVE', 'Approve order'),
  ('ORDER_AMEND_REQUEST', 'Request amendment'),
  ('ORDER_AMEND_APPROVE', 'Approve amendment'),
  ('ORDER_CANCEL_REQUEST', 'Request cancellation'),
  ('ORDER_CANCEL_APPROVE', 'Approve cancellation'),
  ('PROCUREMENT_CREATE', 'Create procurement'),
  ('PROCUREMENT_VERIFY', 'Verify procurement'),
  ('SHIPMENT_CREATE', 'Create shipment'),
  ('SHIPMENT_CONFIRM', 'Confirm shipment'),
  ('BAST_CREATE', 'Create BAST'),
  ('BAST_VERIFY', 'Verify BAST'),
  ('COST_CREATE', 'Create cost'),
  ('MARGIN_VIEW', 'View margin'),
  ('SK_VIEW', 'View SK'),
  ('SK_CREATE', 'Create SK'),
  ('SK_SUBMIT', 'Submit SK'),
  ('SK_ACTIVATE', 'Activate SK'),
  ('QUOTA_VIEW', 'View quota'),
  ('QUOTA_ADJUST_REQUEST', 'Request quota adjustment'),
  ('QUOTA_ADJUST_APPROVE', 'Approve quota adjustment'),
  ('SPATIAL_VIEW', 'View spatial'),
  ('SPATIAL_EDIT_PROSPECT', 'Edit prospect'),
  ('SPATIAL_SCENARIO', 'Run spatial scenario'),
  ('REPORT_VIEW', 'View reports'),
  ('REPORT_EXPORT', 'Export reports'),
  ('USER_MANAGE', 'Manage users'),
  ('ROLE_MANAGE', 'Manage roles'),
  ('AUDIT_VIEW', 'View audit log'),
  ('MASTER_DATA_MANAGE', 'Manage master data'),
  ('ORGANISATION_MANAGE', 'Manage organisation')
on conflict (code) do nothing;

-- Role-Permission mapping (ringkas — bisa expand nanti)
do $$
declare
  staff uuid;
  sup uuid;
  mgr uuid;
  cstaff uuid;
  capp uuid;
  viewer uuid;
  admin uuid;
begin
  select id into staff from public.roles where name='commercial_staff';
  select id into sup from public.roles where name='commercial_supervisor';
  select id into mgr from public.roles where name='commercial_manager';
  select id into cstaff from public.roles where name='compliance_staff';
  select id into capp from public.roles where name='compliance_approver';
  select id into viewer from public.roles where name='management_viewer';
  select id into admin from public.roles where name='system_admin';

  -- staff
  insert into public.role_permissions (role_id, permission_id)
  select staff, id from public.permissions where code in
    ('ORDER_CREATE','ORDER_UPDATE_DRAFT','ORDER_SUBMIT','PROCUREMENT_CREATE','SHIPMENT_CREATE','BAST_CREATE','COST_CREATE','SK_VIEW','QUOTA_VIEW','SPATIAL_VIEW','REPORT_VIEW')
  on conflict do nothing;

  -- supervisor
  insert into public.role_permissions (role_id, permission_id)
  select sup, id from public.permissions where code in
    ('ORDER_REVIEW','ORDER_AMEND_REQUEST','ORDER_CANCEL_REQUEST','PROCUREMENT_VERIFY','SHIPMENT_CONFIRM','BAST_VERIFY','MARGIN_VIEW','SK_VIEW','QUOTA_VIEW','SPATIAL_VIEW','REPORT_VIEW','REPORT_EXPORT')
  on conflict do nothing;

  -- manager
  insert into public.role_permissions (role_id, permission_id)
  select mgr, id from public.permissions where code in
    ('ORDER_APPROVE','ORDER_AMEND_APPROVE','ORDER_CANCEL_APPROVE','MARGIN_VIEW','SK_VIEW','QUOTA_VIEW','SPATIAL_VIEW','SPATIAL_SCENARIO','REPORT_VIEW','REPORT_EXPORT')
  on conflict do nothing;

  -- compliance staff
  insert into public.role_permissions (role_id, permission_id)
  select cstaff, id from public.permissions where code in
    ('SK_VIEW','SK_CREATE','SK_SUBMIT','QUOTA_VIEW','QUOTA_ADJUST_REQUEST','REPORT_VIEW','REPORT_EXPORT')
  on conflict do nothing;

  -- compliance approver
  insert into public.role_permissions (role_id, permission_id)
  select capp, id from public.permissions where code in
    ('SK_VIEW','SK_ACTIVATE','QUOTA_VIEW','QUOTA_ADJUST_APPROVE','REPORT_VIEW','REPORT_EXPORT')
  on conflict do nothing;

  -- viewer
  insert into public.role_permissions (role_id, permission_id)
  select viewer, id from public.permissions where code in
    ('MARGIN_VIEW','SK_VIEW','QUOTA_VIEW','SPATIAL_VIEW','REPORT_VIEW','REPORT_EXPORT')
  on conflict do nothing;

  -- admin
  insert into public.role_permissions (role_id, permission_id)
  select admin, id from public.permissions
  on conflict do nothing;
end $$;