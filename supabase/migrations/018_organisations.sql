-- =========================================================
-- 018_organisations.sql — Enhanced org structure
-- =========================================================

-- Tambahkan kolom manager_id & parent_id ke organisations
alter table public.organisations
  add column if not exists manager_id uuid references public.profiles(id) on delete set null;

-- Update type constraint (kalau ada)
-- Kita pakai: 'root' | 'unit' | 'department' | 'location' | 'cost_center'

-- Seed struktur organisasi dari root yang sudah ada
-- Ambil root org (jika ada)
do $$
declare
  v_root_id uuid;
  v_bu_id uuid;
  v_dept_id uuid;
begin
  -- Ambil root
  select id into v_root_id from organisations where type = 'root' limit 1;
  
  if v_root_id is null then
    raise notice 'No root organisation — skipping seed';
    return;
  end if;

  -- Buat 4 business units
  insert into organisations (code, name, type, parent_id, is_active, description)
  values
    ('BU-001', 'Head Office', 'unit', v_root_id, true, 'Main HQ'),
    ('BU-002', 'Mining Division', 'unit', v_root_id, true, 'Mining ops'),
    ('BU-003', 'Logistics Division', 'unit', v_root_id, true, 'Logistics ops'),
    ('BU-004', 'Trading Division', 'unit', v_root_id, true, 'Trading ops')
  on conflict (code) do nothing;

  -- Buat departments di bawah Head Office
  select id into v_bu_id from organisations where code = 'BU-001';
  if v_bu_id is not null then
    insert into organisations (code, name, type, parent_id, is_active)
    values
      ('DEPT-FIN', 'Finance', 'department', v_bu_id, true),
      ('DEPT-PROC', 'Procurement', 'department', v_bu_id, true),
      ('DEPT-SALES', 'Sales', 'department', v_bu_id, true),
      ('DEPT-OPS', 'Operations', 'department', v_bu_id, true),
      ('DEPT-IT', 'IT', 'department', v_bu_id, true)
    on conflict (code) do nothing;
  end if;

  -- Buat sites sebagai location di bawah Mining Division
  select id into v_bu_id from organisations where code = 'BU-002';
  if v_bu_id is not null then
    insert into organisations (code, name, type, parent_id, is_active)
    values
      ('LOC-BERAU', 'Berau Site', 'location', v_bu_id, true),
      ('LOC-SUMBAWA', 'Sumbawa Site', 'location', v_bu_id, true)
    on conflict (code) do nothing;
  end if;
end $$;

-- Verify
select code, name, type, parent_id from organisations order by code;