-- =========================================================
-- 015_analytics.sql — Analytics views + saved reports
-- =========================================================

-- ---------------------------------------------------------
-- ANALYTICS VIEW: Order Summary
-- ---------------------------------------------------------
create or replace view public.analytics_order_summary as
select
  o.id,
  o.order_number,
  o.customer_id,
  o.site_id,
  o.contract_id,
  o.business_model,
  o.status,
  o.current_stage,
  o.currency,
  o.selling_value,
  o.total_direct_cost,
  o.margin,
  case
    when o.selling_value > 0
    then (o.margin / o.selling_value) * 100
    else 0
  end as margin_pct,
  o.po_date,
  o.created_at,
  date_trunc('day', o.created_at)::date as order_date,
  date_trunc('month', o.created_at)::date as order_month,
  date_trunc('year', o.created_at)::date as order_year,
  o.submitted_at,
  o.approved_at,
  o.issued_at,
  -- Cycle times (days)
  case when o.submitted_at is not null
    then extract(epoch from (o.submitted_at - o.created_at)) / 86400
    else null
  end as days_create_to_submit,
  case when o.approved_at is not null and o.submitted_at is not null
    then extract(epoch from (o.approved_at - o.submitted_at)) / 86400
    else null
  end as days_submit_to_approve,
  case when o.issued_at is not null and o.approved_at is not null
    then extract(epoch from (o.issued_at - o.approved_at)) / 86400
    else null
  end as days_approve_to_issue
from orders o;

-- ---------------------------------------------------------
-- ANALYTICS VIEW: Margin by dimension (site, customer, product)
-- ---------------------------------------------------------
create or replace view public.analytics_margin_by_site as
select
  s.id as site_id,
  s.name as site_name,
  s.code as site_code,
  c.name as customer_name,
  count(o.id) as order_count,
  coalesce(sum(o.selling_value), 0) as selling_value,
  coalesce(sum(o.total_direct_cost), 0) as direct_cost,
  coalesce(sum(o.margin), 0) as margin,
  case when sum(o.selling_value) > 0
    then (sum(o.margin) / sum(o.selling_value)) * 100
    else 0
  end as margin_pct,
  date_trunc('month', o.created_at)::date as month
from orders o
join sites s on s.id = o.site_id
join customers c on c.id = o.customer_id
where o.status not in ('DRAFT', 'CANCELLED')
group by s.id, s.name, s.code, c.name, date_trunc('month', o.created_at);

create or replace view public.analytics_margin_by_customer as
select
  c.id as customer_id,
  c.name as customer_name,
  c.code as customer_code,
  count(o.id) as order_count,
  coalesce(sum(o.selling_value), 0) as selling_value,
  coalesce(sum(o.total_direct_cost), 0) as direct_cost,
  coalesce(sum(o.margin), 0) as margin,
  case when sum(o.selling_value) > 0
    then (sum(o.margin) / sum(o.selling_value)) * 100
    else 0
  end as margin_pct,
  date_trunc('month', o.created_at)::date as month
from orders o
join customers c on c.id = o.customer_id
where o.status not in ('DRAFT', 'CANCELLED')
group by c.id, c.name, c.code, date_trunc('month', o.created_at);

create or replace view public.analytics_margin_by_product as
select
  p.id as product_id,
  p.name as product_name,
  p.code as product_code,
  p.uom,
  count(distinct oi.order_id) as order_count,
  coalesce(sum(oi.qty), 0) as total_qty,
  coalesce(sum(oi.line_value), 0) as selling_value,
  date_trunc('month', oi.created_at)::date as month
from order_items oi
join products p on p.id = oi.product_id
join orders o on o.id = oi.order_id
where o.status not in ('DRAFT', 'CANCELLED')
group by p.id, p.name, p.code, p.uom, date_trunc('month', oi.created_at);

-- ---------------------------------------------------------
-- SAVED REPORTS
-- ---------------------------------------------------------
create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  report_type text not null,
  -- OPERATIONAL | COMMERCIAL | COMPLIANCE | MANAGEMENT | CUSTOM
  filters jsonb not null default '{}'::jsonb,
  fields jsonb not null default '[]'::jsonb,
  sort_by text,
  sort_order text default 'desc',
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists saved_reports_user_idx on public.saved_reports (created_by);

alter table public.saved_reports enable row level security;

drop policy if exists "saved_reports_read" on public.saved_reports;
create policy "saved_reports_read" on public.saved_reports for select
  using (created_by = auth.uid() or is_shared = true);

drop policy if exists "saved_reports_write" on public.saved_reports;
create policy "saved_reports_write" on public.saved_reports for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- ---------------------------------------------------------
-- REPORT RUN LOG (opsional — untuk audit)
-- ---------------------------------------------------------
create table if not exists public.report_runs (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  filters jsonb default '{}'::jsonb,
  format text, -- PDF | XLSX | CSV | JSON
  row_count int,
  executed_at timestamptz not null default now(),
  executed_by uuid
);

alter table public.report_runs enable row level security;

drop policy if exists "report_runs_insert" on public.report_runs;
create policy "report_runs_insert" on public.report_runs for insert
  with check (auth.uid() is not null);

drop policy if exists "report_runs_read" on public.report_runs;
create policy "report_runs_read" on public.report_runs for select
  using (auth.uid() is not null);