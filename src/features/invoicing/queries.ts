import { createClient } from "@/lib/supabase/server";

// ============================================================
// LIST INVOICES
// ============================================================
export async function listInvoices({
  q,
  status,
  customerId,
  orderId,
  page = 1,
  pageSize = 20,
}: {
  q?: string;
  status?: string;
  customerId?: string;
  orderId?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("invoices")
    .select("*, customers(id, code, name), orders(id, order_number)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q)
    query = query.or(`invoice_number.ilike.%${q}%,invoice_ref.ilike.%${q}%`);
  if (status && status !== "all") query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);
  if (orderId) query = query.eq("order_id", orderId);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// ============================================================
// GET INVOICE (defensive — split query)
// ============================================================
export async function getInvoice(id: string) {
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!invoice) return null;

  const [
    { data: customer },
    { data: order },
    { data: items },
    { data: payments },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, code, name, address, email, phone")
      .eq("id", invoice.customer_id)
      .maybeSingle(),
    supabase
      .from("orders")
      .select("id, order_number, po_number, business_model")
      .eq("id", invoice.order_id)
      .maybeSingle(),
    supabase
      .from("invoice_items")
      .select("*, products(id, code, name, uom)")
      .eq("invoice_id", id)
      .order("sort_order"),
    supabase
      .from("invoice_payments")
      .select("*")
      .eq("invoice_id", id)
      .order("payment_date", { ascending: false }),
  ]);

  return {
    ...invoice,
    customers: customer,
    orders: order,
    items: items ?? [],
    payments: payments ?? [],
  };
}

// ============================================================
// INVOICES BY ORDER
// ============================================================
export async function listInvoicesByOrder(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("invoices")
    .select("*, invoice_payments(id, amount, payment_date)")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================
// ORDER INVOICE SUMMARY
// ============================================================
export async function getOrderInvoicingSummary(orderId: string) {
  const supabase = await createClient();

  const [{ data: order }, { data: invoices }] = await Promise.all([
    supabase
      .from("orders")
      .select("selling_value, currency")
      .eq("id", orderId)
      .maybeSingle(),
    supabase
      .from("invoices")
      .select(
        "id, status, amount, amount_with_tax, paid_amount, due_date, currency"
      )
      .eq("order_id", orderId),
  ]);

  const selling = Number(order?.selling_value ?? 0);
  const rows = invoices ?? [];

  const totalInvoiced = rows
    .filter((i) => i.status !== "CANCELLED")
    .reduce((a, i) => a + Number(i.amount), 0);

  const totalWithTax = rows
    .filter((i) => i.status !== "CANCELLED")
    .reduce((a, i) => a + Number(i.amount_with_tax), 0);

  const totalPaid = rows.reduce((a, i) => a + Number(i.paid_amount), 0);
  const outstanding = selling - totalPaid;
  const uninvoiced = Math.max(0, selling - totalInvoiced);
  const overdueCount = rows.filter((i) => i.status === "OVERDUE").length;

  return {
    selling,
    totalInvoiced,
    totalWithTax,
    totalPaid,
    outstanding,
    uninvoiced,
    overdueCount,
    invoiceCount: rows.length,
    currency: order?.currency ?? "IDR",
  };
}

// ============================================================
// DASHBOARD — outstanding mencakup uninvoiced
// ============================================================
// ============================================================
// STATUSES considered "issued" (terbit)
// DRAFT & CANCELLED = tidak terbit
// ============================================================
const ISSUED_STATUSES = ["ISSUED", "SENT", "PARTIAL_PAID", "PAID", "OVERDUE"];

// ============================================================
// DASHBOARD — outstanding dari invoice terbit saja
// ============================================================
export async function getInvoicingDashboard() {
  const supabase = await createClient();

  // 1) Orders aktif
  const { data: orders } = await supabase
    .from("orders")
    .select("id, selling_value, currency, status")
    .in("status", [
      "APPROVED",
      "ISSUED",
      "IN_PROGRESS",
      "PARTIALLY_FULFILLED",
      "FULFILLED",
      "CLOSED",
    ]);

  const activeOrders = orders ?? [];
  const totalOrderValue = activeOrders.reduce(
    (a, o) => a + Number(o.selling_value ?? 0),
    0
  );

  // 2) Semua invoice
  const { data: rows } = await supabase.from("invoice_aging").select("*");
  const all = rows ?? [];

  const issuedRows = all.filter(
    (r) => ISSUED_STATUSES.includes(r.status as string)
  );

  // Total issued (terbit)
  const totalIssued = issuedRows.reduce(
    (a, r) => a + Number(r.amount_with_tax ?? 0),
    0
  );

  // Total paid (dari semua invoice terbit)
  const totalPaid = issuedRows.reduce(
    (a, r) => a + Number(r.paid_amount ?? 0),
    0
  );

  // Outstanding = issued - paid (hanya invoice terbit)
  const totalOutstanding = Math.max(0, totalIssued - totalPaid);

  // Uninvoiced = order value - issued
  const uninvoicedAmount = Math.max(0, totalOrderValue - totalIssued);

  // Overdue
  const overdueRows = issuedRows.filter((r) => r.status === "OVERDUE");
  const overdueCount = overdueRows.length;
  const overdueAmount = overdueRows.reduce(
    (a, r) => a + Number(r.outstanding ?? 0),
    0
  );

  // Aging buckets (dari invoice terbit saja)
  const active = issuedRows.filter((r) => r.status !== "PAID");
  const buckets = ["CURRENT", "1-30", "31-60", "61-90", "90+"].map((b) => ({
    bucket: b,
    count: active.filter((r) => r.aging_bucket === b).length,
    amount: active
      .filter((r) => r.aging_bucket === b)
      .reduce((a, r) => a + Number(r.outstanding ?? 0), 0),
  }));

  // Count order dengan outstanding (belum lunas)
  const ordersWithOutstanding = activeOrders.filter((o) => {
    const orderIssued = issuedRows.filter((i) => i.order_id === o.id);
    const paid = orderIssued.reduce(
      (a, i) => a + Number(i.paid_amount ?? 0),
      0
    );
    const issued = orderIssued.reduce(
      (a, i) => a + Number(i.amount_with_tax ?? 0),
      0
    );
    return issued - paid > 0.01;
  }).length;

  // Count order dengan uninvoiced (belum diterbitkan invoice-nya)
  const uninvoicedOrders = activeOrders.filter((o) => {
    const orderIssued = issuedRows
      .filter((i) => i.order_id === o.id)
      .reduce((a, i) => a + Number(i.amount_with_tax ?? 0), 0);
    return Number(o.selling_value ?? 0) - orderIssued > 0.01;
  });

  const { data: recent } = await supabase
    .from("invoices")
    .select("*, customers(name)")
    .order("created_at", { ascending: false })
    .limit(10);

  return {
    totals: {
      invoices: all.length,
      issued: issuedRows.length,
      orders: activeOrders.length,
      ordersWithOutstanding,
      ordersUninvoiced: uninvoicedOrders.length,
      overdue: overdueCount,
      orderValue: totalOrderValue,
      issuedTotal: totalIssued,
      uninvoiced: uninvoicedAmount,
      paid: totalPaid,
      outstanding: totalOutstanding,
      overdueAmount,
    },
    buckets,
    recent: recent ?? [],
  };
}

// ============================================================
// UNINVOICED ORDERS — dengan alasan
// ============================================================
export async function getUninvoicedOrders() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, business_model, selling_value, currency, current_stage, created_at, customers(name, code), sites(name)"
    )
    .in("status", [
      "APPROVED",
      "ISSUED",
      "IN_PROGRESS",
      "PARTIALLY_FULFILLED",
      "FULFILLED",
      "CLOSED",
    ])
    .order("created_at", { ascending: true });

  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  // Ambil semua invoice ISSUED (bukan DRAFT/CANCELLED)
  const { data: invoices } = await supabase
    .from("invoices")
    .select("order_id, status, amount, amount_with_tax")
    .in("order_id", orderIds)
    .in("status", ISSUED_STATUSES);

  const issuedByOrder = new Map<string, number>();
  for (const inv of invoices ?? []) {
    const prev = issuedByOrder.get(inv.order_id) ?? 0;
    issuedByOrder.set(inv.order_id, prev + Number(inv.amount ?? 0));
  }

  const result = orders
    .map((o) => {
      const issued = issuedByOrder.get(o.id) ?? 0;
      const selling = Number(o.selling_value ?? 0);
      const uninvoiced = Math.max(0, selling - issued);
      const customer = o.customers as { name?: string; code?: string } | null;
      const site = o.sites as { name?: string } | null;

      return {
        id: o.id,
        order_number: o.order_number,
        status: o.status,
        business_model: o.business_model,
        current_stage: o.current_stage,
        selling_value: selling,
        issued,
        uninvoiced,
        currency: o.currency ?? "IDR",
        customer_name: customer?.name ?? "—",
        customer_code: customer?.code ?? "",
        site_name: site?.name ?? "—",
        created_at: o.created_at,
      };
    })
    .filter((o) => o.uninvoiced > 0.01)
    .sort((a, b) => b.uninvoiced - a.uninvoiced);

  return result;
}

// ============================================================
// PROJECT SUMMARY — grouping multi-order per project_code
// ============================================================
export async function listProjectSummaries({
  q,
  page = 1,
  pageSize = 20,
}: {
  q?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("project_summary")
    .select("*", { count: "exact" })
    .order("last_order_at", { ascending: false })
    .range(from, to);

  if (q) query = query.ilike("project_code", `%${q}%`);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

// ============================================================
// PROJECT DETAIL — semua order dalam 1 project_code
// ============================================================
export async function getProjectDetail(projectCode: string) {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, order_type, business_model, status, selling_value, total_direct_cost, margin, ppn_output, pph23_amount, margin_after_tax, currency, created_at, customers(id, code, name)"
    )
    .eq("project_code", projectCode)
    .order("created_at", { ascending: true });

  const { data: summary } = await supabase
    .from("project_summary")
    .select("*")
    .eq("project_code", projectCode)
    .maybeSingle();

  return {
    project_code: projectCode,
    summary: summary ?? null,
    orders: orders ?? [],
  };
}

// ============================================================
// DASHBOARD: revenue split PASS_THROUGH vs FEE
// (untuk analytics — dipakai halaman Analytics/Projects)
// ============================================================
export async function getRevenueSplitByMarginType() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("invoice_items")
    .select("line_type, margin_type, line_value, invoices!inner(status)")
    .in("invoices.status", ["ISSUED", "SENT", "PARTIAL_PAID", "PAID", "OVERDUE"]);

  const rows = data ?? [];

  const byMarginType: Record<string, number> = {};
  const byLineType: Record<string, number> = {};

  for (const r of rows) {
    const mt = r.margin_type ?? "PASS_THROUGH";
    const lt = r.line_type ?? "MATERIAL";
    byMarginType[mt] = (byMarginType[mt] ?? 0) + Number(r.line_value ?? 0);
    byLineType[lt] = (byLineType[lt] ?? 0) + Number(r.line_value ?? 0);
  }

  return { byMarginType, byLineType };
}