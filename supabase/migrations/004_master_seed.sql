-- Demo seed data (opsional, untuk uji coba)
-- Jalankan setelah membuat user admin dan memberi role system_admin.

insert into public.customers (code, name, type, email, phone, industry, payment_term_days, credit_limit, pic_name)
values
  ('CUST-001', 'PT Alam Sejahtera', 'Mining Company', 'contact@alamsejahtera.co.id', '+62 21 1234 5678', 'Mining', 30, 50000000000, 'Budi Santoso'),
  ('CUST-002', 'CV Maju Bersama', 'Trading', 'sales@majubersama.co.id', '+62 21 8765 4321', 'Trading', 14, 5000000000, 'Sari Dewi')
on conflict (code) do nothing;

insert into public.products (code, name, category, uom, description) values
  ('PROD-001', 'ANFO', 'Explosive', 'MT', 'Ammonium Nitrate Fuel Oil'),
  ('PROD-002', 'Detonator', 'Accessories', 'pcs', 'Electric detonator'),
  ('PROD-003', 'Emulsion', 'Explosive', 'MT', 'Emulsion explosive')
on conflict (code) do nothing;

insert into public.vendors (code, name, type, email) values
  ('SUP-001', 'PT Bahan Peledak Indonesia', 'Supplier', 'sales@bpi.co.id'),
  ('SUP-002', 'CV Logistik Nusantara', 'Logistics', 'ops@logistiknusantara.co.id')
on conflict (code) do nothing;

insert into public.transporters (code, name, vehicle_type, plate_number) values
  ('TRP-001', 'PT Trans Aman', 'Truck', 'B 1234 XYZ'),
  ('TRP-002', 'CV Cepat Kirim', 'Truck', 'B 5678 ABC')
on conflict (code) do nothing;