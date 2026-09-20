import { createClient } from "@/lib/supabase/server";
import type {
  StockBalance,
  StockMovement,
  UsageReport,
  UsageReportLine,
} from "./types";

// ============================================================
// LIST USAGE REPORTS
// ============================================================
export async function listUsageReports({
  q,
  status,
  reportType,
  projectCode,
  customerId,
  page = 1,
  pageSize = 20,
}: {
  q?: string;
  status?: string;
  reportType?: string;
  projectCode?: string;
  customerId?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("usage_reports")
    .select(
      "*, customers(id, code, name), orders(id, order_number, business_model)",
      { count: "exact" }
    )
    .order("period_end", { ascending: false })
    .range(from, to);

  if (q) query = query.ilike("report_number", `%${q}%`);
  if (status && status !== "all") query = query.eq("status", status);
  if (reportType) query = query.eq("report_type", reportType);
  if (projectCode) query = query.eq("project_code", projectCode);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// ============================================================
// GET USAGE REPORT (detail + lines)
// ============================================================
export async function getUsageReport(id: string) {
  const supabase = await createClient();

  const { data: report, error } = await supabase
    .from("usage_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!report) return null;

  const [
    { data: customer },
    { data: order },
    { data: site },
    { data: lines },
    { data: invoice },
  ] = await Promise.all([
    report.customer_id
      ? supabase
          .from("customers")
          .select("id, code, name")
          .eq("id", report.customer_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    report.order_id
      ? supabase
          .from("orders")
          .select("id, order_number, business_model, project_code, order_type")
          .eq("id", report.order_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    report.site_id
      ? supabase
          .from("sites")
          .select("id, code, name")
          .eq("id", report.site_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("usage_report_lines")
      .select("*, products(id, code, name, uom)")
      .eq("usage_report_id", id)
      .order("sort_order"),
    report.invoice_id
      ? supabase
          .from("invoices")
          .select("id, invoice_number, status")
          .eq("id", report.invoice_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...report,
    customers: customer,
    orders: order,
    sites: site,
    lines: (lines ?? []) as (UsageReportLine & {
      products?: { id: string; code: string; name: string; uom: string } | null;
    })[],
    invoice,
  };
}

// ============================================================
// STOCK BALANCE per project + product
// ============================================================
export async function getStockBalances({
  projectCode,
  projectId,
  siteId,
}: {
  projectCode?: string;
  projectId?: string;
  siteId?: string;
}): Promise<(StockBalance & { products?: { name: string; uom: string } | null })[]> {
  const supabase = await createClient();

  let query = supabase
    .from("stock_balances")
    .select("*, products(id, code, name, uom)");

  if (projectCode) query = query.eq("project_code", projectCode);
  if (projectId) query = query.eq("project_id", projectId);
  if (siteId) query = query.eq("site_id", siteId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as any[];
}

// ============================================================
// STOCK MOVEMENTS (history)
// ============================================================
export async function listStockMovements({
  projectCode,
  projectId,
  productId,
  limit = 100,
}: {
  projectCode?: string;
  projectId?: string;
  productId?: string;
  limit?: number;
}): Promise<StockMovement[]> {
  const supabase = await createClient();

  let query = supabase
    .from("stock_movements")
    .select("*")
    .order("movement_date", { ascending: false })
    .limit(limit);

  if (projectCode) query = query.eq("project_code", projectCode);
  if (projectId) query = query.eq("project_id", projectId);
  if (productId) query = query.eq("product_id", productId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as StockMovement[];
}

// ============================================================
// USAGE REPORTS by order (untuk detail order)
// ============================================================
export async function listUsageReportsByOrder(orderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usage_reports")
    .select("*, invoice:invoices(id, invoice_number, status)")
    .eq("order_id", orderId)
    .order("period_end", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ============================================================
// USAGE REPORTS pending approval (untuk dashboard)
// ============================================================
export async function listPendingUsageReports(limit = 10) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usage_reports")
    .select("*, customers(name)")
    .in("status", ["SUBMITTED"])
    .order("period_end", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}