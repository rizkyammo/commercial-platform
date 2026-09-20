import { createClient } from "@/lib/supabase/server";

export type ReportFilter = {
  from?: string;
  to?: string;
  customer_id?: string;
  site_id?: string;
  contract_id?: string;
  product_id?: string;
  status?: string;
};

// ============================================================
// ORDER REGISTER
// ============================================================
export async function getOrderRegisterData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select(
      "order_number, po_number, po_date, status, business_model, current_stage, currency, selling_value, total_direct_cost, margin, created_at, customers(name, code), sites(name, code), contracts(name, code)"
    )
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");
  if (filter.customer_id) q = q.eq("customer_id", filter.customer_id);
  if (filter.site_id) q = q.eq("site_id", filter.site_id);
  if (filter.contract_id) q = q.eq("contract_id", filter.contract_id);
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);

  const { data } = await q;
  return (data ?? []).map((o) => ({
    order_number: o.order_number,
    po_number: o.po_number ?? "",
    po_date: o.po_date ?? "",
    customer: (o.customers as any)?.name ?? "",
    site: (o.sites as any)?.name ?? "",
    contract: (o.contracts as any)?.name ?? "",
    business_model: o.business_model,
    status: o.status,
    current_stage: o.current_stage,
    currency: o.currency,
    selling_value: Number(o.selling_value ?? 0),
    total_direct_cost: Number(o.total_direct_cost ?? 0),
    margin: Number(o.margin ?? 0),
    created_at: o.created_at,
  }));
}

// ============================================================
// PROCUREMENT REGISTER
// ============================================================
export async function getProcurementRegisterData(filter: ReportFilter) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("procurements")
    .select(
      "procurement_number, vendor_po, status, currency, material_cost, created_at, orders(order_number, customer_id, site_id, contract_id, created_at), vendors(name)"
    )
    .order("created_at", { ascending: false });

  return (data ?? [])
    .filter((p) => {
      const ord = p.orders as any;
      if (!ord) return false;
      if (filter.from && ord.created_at < filter.from) return false;
      if (filter.to && ord.created_at > filter.to) return false;
      if (filter.customer_id && ord.customer_id !== filter.customer_id) return false;
      if (filter.site_id && ord.site_id !== filter.site_id) return false;
      if (filter.contract_id && ord.contract_id !== filter.contract_id) return false;
      if (filter.status && filter.status !== "all" && p.status !== filter.status) return false;
      return true;
    })
    .map((p) => ({
      procurement_number: p.procurement_number,
      order_number: (p.orders as any)?.order_number ?? "",
      vendor: (p.vendors as any)?.name ?? "",
      vendor_po: p.vendor_po ?? "",
      status: p.status,
      currency: p.currency,
      material_cost: Number(p.material_cost ?? 0),
      created_at: p.created_at,
    }));
}

// ============================================================
// SHIPMENT REGISTER
// ============================================================
export async function getShipmentRegisterData(filter: ReportFilter) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("shipments")
    .select(
      "shipment_number, shipment_date, origin, destination, status, transport_cost, created_at, orders(order_number, customer_id, site_id, contract_id, created_at), transporters(name)"
    )
    .order("created_at", { ascending: false });

  return (data ?? [])
    .filter((s) => {
      const ord = s.orders as any;
      if (!ord) return false;
      if (filter.from && ord.created_at < filter.from) return false;
      if (filter.to && ord.created_at > filter.to) return false;
      if (filter.customer_id && ord.customer_id !== filter.customer_id) return false;
      if (filter.site_id && ord.site_id !== filter.site_id) return false;
      return true;
    })
    .map((s) => ({
      shipment_number: s.shipment_number,
      order_number: (s.orders as any)?.order_number ?? "",
      transporter: (s.transporters as any)?.name ?? "",
      shipment_date: s.shipment_date ?? "",
      origin: s.origin ?? "",
      destination: s.destination ?? "",
      status: s.status,
      transport_cost: Number(s.transport_cost ?? 0),
      created_at: s.created_at,
    }));
}

// ============================================================
// BAST REGISTER
// ============================================================
export async function getBastRegisterData(filter: ReportFilter) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("basts")
    .select(
      "bast_number, bast_date, receiver_name, signed_by, status, created_at, orders(order_number, customer_id, site_id, contract_id, created_at)"
    )
    .order("created_at", { ascending: false });

  return (data ?? [])
    .filter((b) => {
      const ord = b.orders as any;
      if (!ord) return false;
      if (filter.from && ord.created_at < filter.from) return false;
      if (filter.to && ord.created_at > filter.to) return false;
      if (filter.customer_id && ord.customer_id !== filter.customer_id) return false;
      if (filter.site_id && ord.site_id !== filter.site_id) return false;
      return true;
    })
    .map((b) => ({
      bast_number: b.bast_number,
      order_number: (b.orders as any)?.order_number ?? "",
      bast_date: b.bast_date ?? "",
      receiver_name: b.receiver_name ?? "",
      signed_by: b.signed_by ?? "",
      status: b.status,
      created_at: b.created_at,
    }));
}

// ============================================================
// OUTSTANDING BAST
// ============================================================
export async function getOutstandingBastData(filter: ReportFilter) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select(
      "order_number, po_number, status, current_stage, selling_value, currency, created_at, customers(name), sites(name)"
    )
    .in("status", ["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"])
    .neq("bast_status", "COMPLETED")
    .order("created_at", { ascending: true });

  return (data ?? [])
    .filter((o) => {
      if (filter.from && o.created_at < filter.from) return false;
      if (filter.to && o.created_at > filter.to) return false;
      return true;
    })
    .map((o) => ({
      order_number: o.order_number,
      po_number: o.po_number ?? "",
      customer: (o.customers as any)?.name ?? "",
      site: (o.sites as any)?.name ?? "",
      status: o.status,
      current_stage: o.current_stage,
      selling_value: Number(o.selling_value ?? 0),
      currency: o.currency,
      created_at: o.created_at,
    }));
}

// ============================================================
// MARGIN REPORT
// ============================================================
export async function getMarginReportData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select(
      "order_number, business_model, currency, selling_value, total_direct_cost, margin, created_at, customers(name), sites(name), contracts(name)"
    )
    .not("status", "in", "(DRAFT,CANCELLED)")
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");
  if (filter.customer_id) q = q.eq("customer_id", filter.customer_id);
  if (filter.site_id) q = q.eq("site_id", filter.site_id);

  const { data } = await q;
  return (data ?? []).map((o) => {
    const selling = Number(o.selling_value ?? 0);
    const cost = Number(o.total_direct_cost ?? 0);
    const margin = Number(o.margin ?? 0);
    return {
      order_number: o.order_number,
      customer: (o.customers as any)?.name ?? "",
      site: (o.sites as any)?.name ?? "",
      contract: (o.contracts as any)?.name ?? "",
      business_model: o.business_model,
      currency: o.currency,
      selling_value: selling,
      total_direct_cost: cost,
      margin: margin,
      margin_pct: selling > 0 ? (margin / selling) * 100 : 0,
      created_at: o.created_at,
    };
  });
}

// ============================================================
// SK AUTHORIZATION
// ============================================================
export async function getSkAuthorizationData(_filter: ReportFilter) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kemhan_authorizations")
    .select("*")
    .order("effective_date", { ascending: false });

  return (data ?? []).map((s) => ({
    sk_number: s.sk_number,
    issuing_authority: s.issuing_authority,
    issue_date: s.issue_date ?? "",
    effective_date: s.effective_date ?? "",
    expiry_date: s.expiry_date ?? "",
    status: s.status,
  }));
}

// ============================================================
// QUOTA ALLOCATION
// ============================================================
export async function getQuotaAllocationData(_filter: ReportFilter) {
  const supabase = await createClient();
  const { data: sk } = await supabase
    .from("kemhan_authorizations")
    .select("id, sk_number")
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!sk) return [];

  const { data: lines } = await supabase
    .from("kemhan_quota_lines")
    .select("*, products(name, code, uom)")
    .eq("authorization_id", sk.id);

  const lineIds = (lines ?? []).map((l) => l.id);
  const { data: ledger } = lineIds.length
    ? await supabase
        .from("kemhan_quota_ledger")
        .select("quota_line_id, qty, transaction_type")
        .in("quota_line_id", lineIds)
    : { data: [] };

  const byLine = new Map<
    string,
    { committed: number; realized: number; available: number }
  >();
  for (const l of lines ?? []) {
    byLine.set(l.id, { committed: 0, realized: 0, available: 0 });
  }
  for (const e of ledger ?? []) {
    const agg = byLine.get(e.quota_line_id);
    if (!agg) continue;
    const q = Number(e.qty);
    agg.available += q;
    if (e.transaction_type === "PO_COMMITMENT") agg.committed += -q;
    if (e.transaction_type === "PO_RELEASE") agg.committed -= q;
    if (e.transaction_type === "DISTRIBUTION_REALIZATION") agg.realized += -q;
  }

  return (lines ?? []).map((l) => {
    const agg = byLine.get(l.id)!;
    return {
      sk_number: sk.sk_number,
      material: (l.products as any)?.name ?? "",
      code: (l.products as any)?.code ?? "",
      uom: l.uom,
      allocation: Number(l.allocation_qty ?? 0),
      realized: Math.max(0, agg.realized),
      committed: Math.max(0, agg.committed),
      available: Math.max(0, agg.available),
      utilization:
        Number(l.allocation_qty ?? 0) > 0
          ? ((agg.realized + agg.committed) / Number(l.allocation_qty)) * 100
          : 0,
    };
  });
}

// ============================================================
// QUOTA LEDGER
// ============================================================
export async function getQuotaLedgerData(filter: ReportFilter) {
  const supabase = await createClient();
  let q = supabase
    .from("kemhan_quota_ledger")
    .select(
      "created_at, transaction_type, qty, reason, quota_line_id, kemhan_quota_lines(products(name, code, uom))"
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");

  const { data } = await q;
  return (data ?? []).map((e) => ({
    created_at: e.created_at,
    transaction_type: e.transaction_type,
    material: (e.kemhan_quota_lines as any)?.products?.name ?? "",
    qty: Number(e.qty),
    reason: e.reason ?? "",
  }));
}

// ============================================================
// TAX REPORT
// ============================================================
export async function getTaxReportData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("order_tax_summary")
    .select("*")
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");
  if (filter.customer_id) q = q.eq("customer_id", filter.customer_id);
  if (filter.site_id) q = q.eq("site_id", filter.site_id);

  const { data } = await q;

  return (data ?? []).map((r) => ({
    order_number: r.order_number,
    selling_dpp: Number(r.selling_dpp ?? 0),
    ppn_output: Number(r.ppn_output ?? 0),
    ppn_input: Number(r.ppn_input ?? 0),
    ppn_payable: Number(r.ppn_payable ?? 0),
    pph23_amount: Number(r.pph23_amount ?? 0),
    total_tax: Number(r.total_tax ?? 0),
    margin_before_tax: Number(r.margin_before_tax ?? 0),
    margin_after_tax: Number(r.margin_after_tax ?? 0),
    created_at: r.created_at,
  }));
}

// ============================================================
// MARGIN BEFORE vs AFTER TAX
// ============================================================
export async function getMarginTaxReportData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("order_tax_summary")
    .select(
      "order_number, selling_dpp, cost_dpp, margin_before_tax, margin_pct_before_tax, ppn_output, ppn_input, ppn_payable, pph23_amount, total_tax, margin_after_tax, margin_pct_after_tax, created_at"
    )
    .not("status", "in", "(DRAFT,CANCELLED)")
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");
  if (filter.customer_id) q = q.eq("customer_id", filter.customer_id);
  if (filter.site_id) q = q.eq("site_id", filter.site_id);

  const { data } = await q;

  return (data ?? []).map((r) => ({
    order_number: r.order_number,
    selling_dpp: Number(r.selling_dpp ?? 0),
    cost_dpp: Number(r.cost_dpp ?? 0),
    margin_before_tax: Number(r.margin_before_tax ?? 0),
    margin_pct_before_tax: Number(r.margin_pct_before_tax ?? 0),
    ppn_payable: Number(r.ppn_payable ?? 0),
    pph23_amount: Number(r.pph23_amount ?? 0),
    total_tax: Number(r.total_tax ?? 0),
    margin_after_tax: Number(r.margin_after_tax ?? 0),
    margin_pct_after_tax: Number(r.margin_pct_after_tax ?? 0),
    created_at: r.created_at,
  }));
}

// ============================================================
// DISPATCHER — ambil data berdasarkan report type
// ============================================================
export async function generateReportData(
  reportKey: string,
  filter: ReportFilter
): Promise<{ rows: Record<string, unknown>[]; title: string }> {
  switch (reportKey) {
    // ===================== EXISTING =====================
    case "order-register":
      return { rows: await getOrderRegisterData(filter), title: "Order Register" };
    case "order-progress":
      return { rows: await getOrderProgressData(filter), title: "Order Progress Report" };
    case "procurement-register":
      return { rows: await getProcurementRegisterData(filter), title: "Procurement Register" };
    case "shipment-register":
      return { rows: await getShipmentRegisterData(filter), title: "Shipment Register" };
    case "bast-register":
      return { rows: await getBastRegisterData(filter), title: "BAST Register" };
    case "outstanding-bast":
      return { rows: await getOutstandingBastData(filter), title: "Outstanding BAST" };
    case "cost-report":
      return { rows: await getMarginReportData(filter), title: "Cost Report" };
    case "margin-report":
      return { rows: await getMarginReportData(filter), title: "Margin Report" };
    case "margin-by-site":
      return { rows: await getMarginReportData(filter), title: "Margin by Site" };
    case "margin-by-customer":
      return { rows: await getMarginReportData(filter), title: "Margin by Customer" };
    case "contract-performance":
      return { rows: await getContractPerformanceData(filter), title: "Contract Performance" };
    case "sk-authorization":
      return { rows: await getSkAuthorizationData(filter), title: "SK Authorization Report" };
    case "quota-allocation":
      return { rows: await getQuotaAllocationData(filter), title: "Quota Allocation Report" };
    case "quota-realization":
      return { rows: await getQuotaRealizationData(filter), title: "Quota Realization Report" };
    case "quota-ledger":
      return { rows: await getQuotaLedgerData(filter), title: "Quota Ledger" };
    case "monthly-commercial":
      return { rows: await getMonthlyCommercialData(filter), title: "Monthly Commercial Review" };
    case "yearly-commercial":
      return { rows: await getYearlyCommercialData(filter), title: "Yearly Commercial Review" };
    case "consignment-usage":
      return { rows: await getConsignmentUsageData(filter), title: "Consignment Usage" };
    case "tax-report":
      return { rows: await getTaxReportData(filter), title: "Tax Report (PPN + PPh 23)" };
    case "margin-tax-report":
      return { rows: await getMarginTaxReportData(filter), title: "Margin Before vs After Tax" };

    // ===================== NEW: OPERATIONAL =====================
    case "usage-report-register":
      return { rows: await getUsageReportRegisterData(filter), title: "Usage Report Register" };
    case "stock-balance":
      return { rows: await getStockBalanceData(filter), title: "Stock Balance" };
    case "stock-movement":
      return { rows: await getStockMovementData(filter), title: "Stock Movement" };
    case "invoice-register":
      return { rows: await getInvoiceRegisterData(filter), title: "Invoice Register" };

    // ===================== NEW: COMMERCIAL =====================
    case "project-summary":
      return { rows: await getProjectSummaryData(filter), title: "Project Summary" };
    case "project-pnl":
      return { rows: await getProjectPnlData(filter), title: "Project P&L" };
    case "service-fee-report":
      return { rows: await getServiceFeeReportData(filter), title: "Service Fee Report" };
    case "pass-through-report":
      return { rows: await getPassThroughReportData(filter), title: "Pass-Through Report" };
    case "revenue-split":
      return { rows: await getRevenueSplitData(filter), title: "Revenue Split" };
    case "invoice-aging":
      return { rows: await getInvoiceAgingData(filter), title: "Invoice Aging" };
    case "payment-register":
      return { rows: await getPaymentRegisterData(filter), title: "Payment Register" };
    case "invoicing-by-business-model":
      return {
        rows: await getInvoicingByBusinessModelData(filter),
        title: "Invoicing by Business Model",
      };

    // ===================== NEW: MANAGEMENT =====================
    case "business-model-performance":
      return {
        rows: await getBusinessModelPerformanceData(filter),
        title: "Business Model Performance",
      };
    case "flow-category-performance":
      return {
        rows: await getFlowCategoryPerformanceData(filter),
        title: "Flow Category Performance",
      };
    case "order-type-performance":
      return {
        rows: await getOrderTypePerformanceData(filter),
        title: "Order Type Performance",
      };

    default:
      console.warn("[generateReportData] Unknown report key:", reportKey);
      return { rows: [], title: "Unknown Report" };
  }
}

// ============================================================
// ORDER PROGRESS
// ============================================================
export async function getOrderProgressData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select(
      "order_number, po_number, status, business_model, current_stage, compliance_status, procurement_status, shipment_status, delivery_status, bast_status, selling_value, currency, created_at, customers(name), sites(name)"
    )
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");
  if (filter.customer_id) q = q.eq("customer_id", filter.customer_id);
  if (filter.site_id) q = q.eq("site_id", filter.site_id);
  if (filter.contract_id) q = q.eq("contract_id", filter.contract_id);
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);

  const { data } = await q;

  return (data ?? []).map((o) => ({
    order_number: o.order_number,
    po_number: o.po_number ?? "",
    customer: (o.customers as any)?.name ?? "",
    site: (o.sites as any)?.name ?? "",
    business_model: o.business_model,
    status: o.status,
    current_stage: o.current_stage,
    compliance_status: o.compliance_status ?? "",
    procurement_status: o.procurement_status ?? "",
    shipment_status: o.shipment_status ?? "",
    delivery_status: o.delivery_status ?? "",
    bast_status: o.bast_status ?? "",
    value: Number(o.selling_value ?? 0),
    currency: o.currency ?? "IDR",
    created_at: o.created_at,
  }));
}

// ============================================================
// CONTRACT PERFORMANCE
// ============================================================
export async function getContractPerformanceData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select(
      "selling_value, total_direct_cost, margin, status, created_at, contracts(code, name), customers(name)"
    )
    .not("contract_id", "is", null)
    .not("status", "in", "(DRAFT,CANCELLED)")
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");
  if (filter.contract_id) q = q.eq("contract_id", filter.contract_id);

  const { data } = await q;

  const agg = new Map<
    string,
    {
      contract_code: string;
      contract_name: string;
      customer: string;
      order_count: number;
      selling_value: number;
      direct_cost: number;
      margin: number;
      completed: number;
    }
  >();

  for (const o of data ?? []) {
    const c = (o.contracts as { code?: string; name?: string } | null) ?? null;
    if (!c) continue;
    const key = c.code ?? c.name ?? "—";
    const a = agg.get(key) ?? {
      contract_code: c.code ?? "",
      contract_name: c.name ?? "",
      customer: (o.customers as any)?.name ?? "",
      order_count: 0,
      selling_value: 0,
      direct_cost: 0,
      margin: 0,
      completed: 0,
    };
    a.order_count += 1;
    a.selling_value += Number(o.selling_value ?? 0);
    a.direct_cost += Number(o.total_direct_cost ?? 0);
    a.margin += Number(o.margin ?? 0);
    if (["FULFILLED", "CLOSED"].includes(o.status)) a.completed += 1;
    agg.set(key, a);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.selling_value - a.selling_value)
    .map((c) => ({
      contract_code: c.contract_code,
      contract_name: c.contract_name,
      customer: c.customer,
      order_count: c.order_count,
      completed: c.completed,
      selling_value: c.selling_value,
      direct_cost: c.direct_cost,
      margin: c.margin,
      margin_pct:
        c.selling_value > 0 ? (c.margin / c.selling_value) * 100 : 0,
    }));
}

// ============================================================
// QUOTA REALIZATION
// ============================================================
export async function getQuotaRealizationData(_filter: ReportFilter) {
  const supabase = await createClient();

  const { data: sk } = await supabase
    .from("kemhan_authorizations")
    .select("id, sk_number")
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!sk) return [];

  const { data: lines } = await supabase
    .from("kemhan_quota_lines")
    .select("id, allocation_qty, uom, products(name, code)")
    .eq("authorization_id", sk.id);

  const lineIds = (lines ?? []).map((l) => l.id);
  const { data: ledger } = lineIds.length
    ? await supabase
        .from("kemhan_quota_ledger")
        .select(
          "quota_line_id, qty, transaction_type, created_at, reason, order_id"
        )
        .in("quota_line_id", lineIds)
        .eq("transaction_type", "DISTRIBUTION_REALIZATION")
        .order("created_at", { ascending: false })
    : { data: [] };

  const lineMap = new Map(
    (lines ?? []).map((l) => [
      l.id,
      {
        material: (l.products as { name?: string; code?: string } | null)?.name ?? "",
        code: (l.products as { name?: string; code?: string } | null)?.code ?? "",
        uom: l.uom,
      },
    ])
  );

  return (ledger ?? []).map((e) => {
    const m = lineMap.get(e.quota_line_id);
    return {
      date: e.created_at,
      sk_number: sk.sk_number,
      material: m?.material ?? "",
      material_code: m?.code ?? "",
      uom: m?.uom ?? "",
      realized_qty: Math.abs(Number(e.qty ?? 0)),
      reason: e.reason ?? "",
    };
  });
}

// ============================================================
// MONTHLY COMMERCIAL REVIEW
// ============================================================
export async function getMonthlyCommercialData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select(
      "selling_value, total_direct_cost, margin, status, created_at"
    )
    .not("status", "in", "(DRAFT,CANCELLED)")
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");

  const { data } = await q;

  const agg = new Map<
    string,
    {
      month: string;
      order_count: number;
      completed: number;
      selling_value: number;
      direct_cost: number;
      margin: number;
    }
  >();

  for (const o of data ?? []) {
    const month = (o.created_at as string).slice(0, 7);
    const a = agg.get(month) ?? {
      month,
      order_count: 0,
      completed: 0,
      selling_value: 0,
      direct_cost: 0,
      margin: 0,
    };
    a.order_count += 1;
    if (["FULFILLED", "CLOSED"].includes(o.status)) a.completed += 1;
    a.selling_value += Number(o.selling_value ?? 0);
    a.direct_cost += Number(o.total_direct_cost ?? 0);
    a.margin += Number(o.margin ?? 0);
    agg.set(month, a);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.month.localeCompare(a.month))
    .map((m) => ({
      period: m.month,
      order_count: m.order_count,
      completed_count: m.completed,
      selling_value: m.selling_value,
      direct_cost: m.direct_cost,
      margin: m.margin,
      margin_pct:
        m.selling_value > 0 ? (m.margin / m.selling_value) * 100 : 0,
    }));
}

// ============================================================
// YEARLY COMMERCIAL REVIEW
// ============================================================
export async function getYearlyCommercialData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select(
      "selling_value, total_direct_cost, margin, status, created_at"
    )
    .not("status", "in", "(DRAFT,CANCELLED)")
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");

  const { data } = await q;

  const agg = new Map<
    string,
    {
      year: string;
      order_count: number;
      completed: number;
      selling_value: number;
      direct_cost: number;
      margin: number;
    }
  >();

  for (const o of data ?? []) {
    const year = (o.created_at as string).slice(0, 4);
    const a = agg.get(year) ?? {
      year,
      order_count: 0,
      completed: 0,
      selling_value: 0,
      direct_cost: 0,
      margin: 0,
    };
    a.order_count += 1;
    if (["FULFILLED", "CLOSED"].includes(o.status)) a.completed += 1;
    a.selling_value += Number(o.selling_value ?? 0);
    a.direct_cost += Number(o.total_direct_cost ?? 0);
    a.margin += Number(o.margin ?? 0);
    agg.set(year, a);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.year.localeCompare(a.year))
    .map((y) => ({
      period: y.year,
      order_count: y.order_count,
      completed_count: y.completed,
      selling_value: y.selling_value,
      direct_cost: y.direct_cost,
      margin: y.margin,
      margin_pct:
        y.selling_value > 0 ? (y.margin / y.selling_value) * 100 : 0,
    }));
}

// ============================================================
// CONSIGNMENT USAGE
// ============================================================
export async function getConsignmentUsageData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select(
      "order_number, business_model, selling_value, currency, created_at, customers(name), sites(name)"
    )
    .in("business_model", ["Consignment", "Managed Inventory / VMI"])
    .not("status", "in", "(DRAFT,CANCELLED)")
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");

  const { data } = await q;

  return (data ?? []).map((o) => ({
    order_number: o.order_number,
    customer: (o.customers as any)?.name ?? "",
    site: (o.sites as any)?.name ?? "",
    business_model: o.business_model,
    selling_value: Number(o.selling_value ?? 0),
    currency: o.currency ?? "IDR",
    created_at: o.created_at,
  }));
}

// ============================================================
// OPERATIONAL — NEW
// ============================================================

// Usage Report Register
export async function getUsageReportRegisterData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("usage_reports")
    .select(
      "report_number, report_date, period_start, period_end, period_type, report_type, business_model, project_code, status, created_at, customers(name), sites(name)"
    )
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("report_date", filter.from);
  if (filter.to) q = q.lte("report_date", filter.to);
  if (filter.customer_id) q = q.eq("customer_id", filter.customer_id);
  if (filter.site_id) q = q.eq("site_id", filter.site_id);
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);

  const { data } = await q;

  return (data ?? []).map((r) => ({
    report_number: r.report_number ?? "",
    report_date: r.report_date ?? "",
    period: `${r.period_start ?? "—"} s/d ${r.period_end ?? "—"}`,
    period_type: r.period_type ?? "",
    report_type: r.report_type ?? "",
    business_model: r.business_model ?? "",
    project_code: r.project_code ?? "",
    customer: (r.customers as any)?.name ?? "",
    site: (r.sites as any)?.name ?? "",
    status: r.status ?? "",
    created_at: r.created_at,
  }));
}

// Stock Balance (view: stock_balances)
export async function getStockBalanceData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("stock_balances")
    .select("*")
    .order("product_name", { ascending: true });

  if (filter.site_id) q = q.eq("site_id", filter.site_id);
  if (filter.product_id) q = q.eq("product_id", filter.product_id);

  const { data } = await q;

  return (data ?? []).map((s: any) => ({
    product_code: s.product_code ?? "",
    product_name: s.product_name ?? "",
    site_name: s.site_name ?? "",
    uom: s.uom ?? "",
    balance_qty: Number(s.balance_qty ?? 0),
  }));
}

// Stock Movement
export async function getStockMovementData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("stock_movements")
    .select(
      "movement_date, movement_type, qty, reference_type, reference_id, notes, created_at, products(name, code, uom), sites(name)"
    )
    .order("movement_date", { ascending: false })
    .limit(1000);

  if (filter.from) q = q.gte("movement_date", filter.from);
  if (filter.to) q = q.lte("movement_date", filter.to);
  if (filter.site_id) q = q.eq("site_id", filter.site_id);
  if (filter.product_id) q = q.eq("product_id", filter.product_id);

  const { data } = await q;

  return (data ?? []).map((m: any) => ({
    movement_date: m.movement_date ?? m.created_at,
    movement_type: m.movement_type ?? "",
    product_code: (m.products as any)?.code ?? "",
    product_name: (m.products as any)?.name ?? "",
    uom: (m.products as any)?.uom ?? "",
    site: (m.sites as any)?.name ?? "",
    qty: Number(m.qty ?? 0),
    reference_type: m.reference_type ?? "",
    notes: m.notes ?? "",
  }));
}

// Invoice Register
export async function getInvoiceRegisterData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("invoices")
    .select(
      "invoice_number, invoice_date, due_date, status, billing_model, flow_category, subtotal, tax_amount, total_amount, paid_amount, currency, project_code, created_at, customers(name), orders(order_number)"
    )
    .order("invoice_date", { ascending: false });

  if (filter.from) q = q.gte("invoice_date", filter.from);
  if (filter.to) q = q.lte("invoice_date", filter.to);
  if (filter.customer_id) q = q.eq("customer_id", filter.customer_id);
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);

  const { data } = await q;

  return (data ?? []).map((i: any) => {
    const total = Number(i.total_amount ?? 0);
    const paid = Number(i.paid_amount ?? 0);
    return {
      invoice_number: i.invoice_number ?? "",
      invoice_date: i.invoice_date ?? "",
      due_date: i.due_date ?? "",
      customer: (i.customers as any)?.name ?? "",
      order_number: (i.orders as any)?.order_number ?? "",
      project_code: i.project_code ?? "",
      billing_model: i.billing_model ?? "",
      flow_category: i.flow_category ?? "",
      status: i.status ?? "",
      currency: i.currency ?? "IDR",
      subtotal: Number(i.subtotal ?? 0),
      tax_amount: Number(i.tax_amount ?? 0),
      total_amount: total,
      paid_amount: paid,
      outstanding: Math.max(0, total - paid),
    };
  });
}

// ============================================================
// COMMERCIAL — NEW
// ============================================================

// Project Summary (group by project_code)
export async function getProjectSummaryData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select(
      "project_code, project_name, order_type, selling_value, total_direct_cost, margin, status, created_at, customers(name)"
    )
    .not("status", "in", "(DRAFT,CANCELLED)")
    .not("project_code", "is", null)
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");
  if (filter.customer_id) q = q.eq("customer_id", filter.customer_id);

  const { data } = await q;

  const agg = new Map<string, any>();
  for (const o of data ?? []) {
    const key = (o as any).project_code as string;
    if (!key) continue;
    const a = agg.get(key) ?? {
      project_code: key,
      project_name: (o as any).project_name ?? "",
      customer: ((o as any).customers as any)?.name ?? "",
      order_count: 0,
      selling_value: 0,
      direct_cost: 0,
      margin: 0,
    };
    a.order_count += 1;
    a.selling_value += Number((o as any).selling_value ?? 0);
    a.direct_cost += Number((o as any).total_direct_cost ?? 0);
    a.margin += Number((o as any).margin ?? 0);
    agg.set(key, a);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.selling_value - a.selling_value)
    .map((p) => ({
      project_code: p.project_code,
      project_name: p.project_name,
      customer: p.customer,
      order_count: p.order_count,
      selling_value: p.selling_value,
      direct_cost: p.direct_cost,
      margin: p.margin,
      margin_pct: p.selling_value > 0 ? (p.margin / p.selling_value) * 100 : 0,
    }));
}

// Project P&L (group by project_code, split by order_type)
export async function getProjectPnlData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select(
      "project_code, project_name, order_type, selling_value, total_direct_cost, margin, created_at"
    )
    .not("status", "in", "(DRAFT,CANCELLED)")
    .not("project_code", "is", null);

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");

  const { data } = await q;

  const agg = new Map<string, any>();
  for (const o of data ?? []) {
    const key = `${(o as any).project_code}::${(o as any).order_type ?? "MATERIAL"}`;
    const a = agg.get(key) ?? {
      project_code: (o as any).project_code,
      project_name: (o as any).project_name ?? "",
      order_type: (o as any).order_type ?? "MATERIAL",
      order_count: 0,
      revenue: 0,
      cost: 0,
      margin: 0,
    };
    a.order_count += 1;
    a.revenue += Number((o as any).selling_value ?? 0);
    a.cost += Number((o as any).total_direct_cost ?? 0);
    a.margin += Number((o as any).margin ?? 0);
    agg.set(key, a);
  }

  return Array.from(agg.values())
    .sort((a, b) =>
      a.project_code === b.project_code
        ? a.order_type.localeCompare(b.order_type)
        : a.project_code.localeCompare(b.project_code)
    )
    .map((p) => ({
      project_code: p.project_code,
      project_name: p.project_name,
      order_type: p.order_type,
      order_count: p.order_count,
      revenue: p.revenue,
      cost: p.cost,
      margin: p.margin,
      margin_pct: p.revenue > 0 ? (p.margin / p.revenue) * 100 : 0,
    }));
}

// ============================================================
// SERVICE FEE REPORT
// ============================================================
export async function getServiceFeeReportData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("order_items")
    .select(
      "line_type, margin_type, unit_cost, unit_price_idr, qty, line_value, orders!inner(order_number, project_code, status, created_at, customers(name))"
    )
    .like("line_type", "SERVICE_%");

  if (filter.from) q = q.gte("orders.created_at", filter.from);
  if (filter.to) q = q.lte("orders.created_at", filter.to + "T23:59:59");
  if (filter.customer_id) q = q.eq("orders.customer_id", filter.customer_id);

  const { data, error } = await q;

  if (error) {
    console.error("[getServiceFeeReportData]", error);
    return [];
  }

  return (data ?? [])
    .filter(
      (r: any) =>
        r.orders && !["DRAFT", "CANCELLED"].includes(r.orders.status)
    )
    .map((r: any) => ({
      order_number: r.orders?.order_number ?? "",
      project_code: r.orders?.project_code ?? "",
      customer: r.orders?.customers?.name ?? "",
      line_type: r.line_type ?? "",
      margin_type: r.margin_type ?? "",
      qty: Number(r.qty ?? 0),
      unit_cost: Number(r.unit_cost ?? 0),
      unit_price: Number(r.unit_price_idr ?? 0),
      total_price: Number(r.line_value ?? 0),
      fee_amount:
        Number(r.line_value ?? 0) -
        Number(r.unit_cost ?? 0) * Number(r.qty ?? 0),
    }));
}

// ============================================================
// PASS-THROUGH REPORT
// ============================================================
export async function getPassThroughReportData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("order_items")
    .select(
      "line_type, unit_cost, unit_price_idr, qty, line_value, orders!inner(order_number, project_code, status, created_at, customers(name))"
    )
    .eq("margin_type", "PASS_THROUGH");

  if (filter.from) q = q.gte("orders.created_at", filter.from);
  if (filter.to) q = q.lte("orders.created_at", filter.to + "T23:59:59");
  if (filter.customer_id) q = q.eq("orders.customer_id", filter.customer_id);

  const { data, error } = await q;

  if (error) {
    console.error("[getPassThroughReportData]", error);
    return [];
  }

  return (data ?? [])
    .filter(
      (r: any) =>
        r.orders && !["DRAFT", "CANCELLED"].includes(r.orders.status)
    )
    .map((r: any) => ({
      order_number: r.orders?.order_number ?? "",
      project_code: r.orders?.project_code ?? "",
      customer: r.orders?.customers?.name ?? "",
      line_type: r.line_type ?? "",
      qty: Number(r.qty ?? 0),
      unit_cost: Number(r.unit_cost ?? 0),
      unit_price: Number(r.unit_price_idr ?? 0),
      total_price: Number(r.line_value ?? 0),
      pass_through_amount: Number(r.line_value ?? 0),
    }));
}

// ============================================================
// REVENUE SPLIT
// ============================================================
export async function getRevenueSplitData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("order_items")
    .select(
      "line_type, margin_type, unit_cost, qty, line_value, orders!inner(status, created_at)"
    );

  if (filter.from) q = q.gte("orders.created_at", filter.from);
  if (filter.to) q = q.lte("orders.created_at", filter.to + "T23:59:59");

  const { data, error } = await q;

  if (error) {
    console.error("[getRevenueSplitData]", error);
    return [];
  }

  const agg = new Map<string, any>();
  for (const r of data ?? []) {
    const ord = (r as any).orders;
    if (!ord || ["DRAFT", "CANCELLED"].includes(ord.status)) continue;
    const key = `${(r as any).margin_type ?? "—"}::${(r as any).line_type ?? "—"}`;
    const a = agg.get(key) ?? {
      margin_type: (r as any).margin_type ?? "",
      line_type: (r as any).line_type ?? "",
      line_count: 0,
      qty: 0,
      revenue: 0,
      cost: 0,
    };
    a.line_count += 1;
    a.qty += Number((r as any).qty ?? 0);
    a.revenue += Number((r as any).line_value ?? 0);
    a.cost +=
      Number((r as any).unit_cost ?? 0) * Number((r as any).qty ?? 0);
    agg.set(key, a);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.revenue - a.revenue)
    .map((r) => ({
      margin_type: r.margin_type,
      line_type: r.line_type,
      line_count: r.line_count,
      qty: r.qty,
      revenue: r.revenue,
      cost: r.cost,
      margin: r.revenue - r.cost,
      margin_pct:
        r.revenue > 0 ? ((r.revenue - r.cost) / r.revenue) * 100 : 0,
    }));
}

// Invoice Aging (view: invoice_aging)
export async function getInvoiceAgingData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("invoice_aging")
    .select("*")
    .order("days_overdue", { ascending: false });

  if (filter.customer_id) q = q.eq("customer_id", filter.customer_id);

  const { data } = await q;

  return (data ?? []).map((i: any) => ({
    invoice_number: i.invoice_number ?? "",
    invoice_date: i.invoice_date ?? "",
    due_date: i.due_date ?? "",
    customer: i.customer_name ?? "",
    total_amount: Number(i.total_amount ?? 0),
    paid_amount: Number(i.paid_amount ?? 0),
    outstanding: Number(i.outstanding ?? 0),
    days_overdue: Number(i.days_overdue ?? 0),
    aging_bucket: i.aging_bucket ?? "",
    status: i.status ?? "",
  }));
}

// Payment Register
export async function getPaymentRegisterData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("invoice_payments")
    .select(
      "payment_date, amount, payment_method, reference_number, notes, created_at, invoices(invoice_number, customers(name))"
    )
    .order("payment_date", { ascending: false });

  if (filter.from) q = q.gte("payment_date", filter.from);
  if (filter.to) q = q.lte("payment_date", filter.to);

  const { data } = await q;

  return (data ?? []).map((p: any) => ({
    payment_date: p.payment_date ?? "",
    invoice_number: p.invoices?.invoice_number ?? "",
    customer: p.invoices?.customers?.name ?? "",
    payment_method: p.payment_method ?? "",
    reference_number: p.reference_number ?? "",
    amount: Number(p.amount ?? 0),
    notes: p.notes ?? "",
  }));
}

// Invoicing by Business Model
export async function getInvoicingByBusinessModelData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("invoices")
    .select(
      "billing_model, flow_category, total_amount, paid_amount, status, invoice_date, created_at"
    )
    .order("invoice_date", { ascending: false });

  if (filter.from) q = q.gte("invoice_date", filter.from);
  if (filter.to) q = q.lte("invoice_date", filter.to);

  const { data } = await q;

  const agg = new Map<string, any>();
  for (const i of data ?? []) {
    const key = `${(i as any).billing_model ?? "—"}::${(i as any).flow_category ?? "—"}`;
    const a = agg.get(key) ?? {
      billing_model: (i as any).billing_model ?? "",
      flow_category: (i as any).flow_category ?? "",
      invoice_count: 0,
      total_invoiced: 0,
      total_paid: 0,
    };
    a.invoice_count += 1;
    a.total_invoiced += Number((i as any).total_amount ?? 0);
    a.total_paid += Number((i as any).paid_amount ?? 0);
    agg.set(key, a);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.total_invoiced - a.total_invoiced)
    .map((r) => ({
      billing_model: r.billing_model,
      flow_category: r.flow_category,
      invoice_count: r.invoice_count,
      total_invoiced: r.total_invoiced,
      total_paid: r.total_paid,
      outstanding: Math.max(0, r.total_invoiced - r.total_paid),
    }));
}

// ============================================================
// MANAGEMENT — NEW
// ============================================================

// Business Model Performance
export async function getBusinessModelPerformanceData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select("business_model, selling_value, total_direct_cost, margin, status, created_at")
    .not("status", "in", "(DRAFT,CANCELLED)")
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");

  const { data } = await q;

  const agg = new Map<string, any>();
  for (const o of data ?? []) {
    const key = (o as any).business_model ?? "—";
    const a = agg.get(key) ?? {
      business_model: key,
      order_count: 0,
      completed: 0,
      selling_value: 0,
      direct_cost: 0,
      margin: 0,
    };
    a.order_count += 1;
    if (["FULFILLED", "CLOSED"].includes((o as any).status)) a.completed += 1;
    a.selling_value += Number((o as any).selling_value ?? 0);
    a.direct_cost += Number((o as any).total_direct_cost ?? 0);
    a.margin += Number((o as any).margin ?? 0);
    agg.set(key, a);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.selling_value - a.selling_value)
    .map((r) => ({
      business_model: r.business_model,
      order_count: r.order_count,
      completed: r.completed,
      selling_value: r.selling_value,
      direct_cost: r.direct_cost,
      margin: r.margin,
      margin_pct: r.selling_value > 0 ? (r.margin / r.selling_value) * 100 : 0,
    }));
}

// Flow Category Performance
export async function getFlowCategoryPerformanceData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("invoices")
    .select("flow_category, billing_model, total_amount, paid_amount, status, invoice_date");

  if (filter.from) q = q.gte("invoice_date", filter.from);
  if (filter.to) q = q.lte("invoice_date", filter.to);

  const { data } = await q;

  const agg = new Map<string, any>();
  for (const i of data ?? []) {
    const key = (i as any).flow_category ?? "—";
    const a = agg.get(key) ?? {
      flow_category: key,
      invoice_count: 0,
      total_invoiced: 0,
      total_paid: 0,
      paid_count: 0,
    };
    a.invoice_count += 1;
    if ((i as any).status === "PAID") a.paid_count += 1;
    a.total_invoiced += Number((i as any).total_amount ?? 0);
    a.total_paid += Number((i as any).paid_amount ?? 0);
    agg.set(key, a);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.total_invoiced - a.total_invoiced)
    .map((r) => ({
      flow_category: r.flow_category,
      invoice_count: r.invoice_count,
      paid_count: r.paid_count,
      total_invoiced: r.total_invoiced,
      total_paid: r.total_paid,
      outstanding: Math.max(0, r.total_invoiced - r.total_paid),
      collection_pct: r.total_invoiced > 0 ? (r.total_paid / r.total_invoiced) * 100 : 0,
    }));
}

// Order Type Performance
export async function getOrderTypePerformanceData(filter: ReportFilter) {
  const supabase = await createClient();

  let q = supabase
    .from("orders")
    .select("order_type, selling_value, total_direct_cost, margin, status, created_at")
    .not("status", "in", "(DRAFT,CANCELLED)")
    .order("created_at", { ascending: false });

  if (filter.from) q = q.gte("created_at", filter.from);
  if (filter.to) q = q.lte("created_at", filter.to + "T23:59:59");

  const { data } = await q;

  const agg = new Map<string, any>();
  for (const o of data ?? []) {
    const key = (o as any).order_type ?? "MATERIAL";
    const a = agg.get(key) ?? {
      order_type: key,
      order_count: 0,
      selling_value: 0,
      direct_cost: 0,
      margin: 0,
    };
    a.order_count += 1;
    a.selling_value += Number((o as any).selling_value ?? 0);
    a.direct_cost += Number((o as any).total_direct_cost ?? 0);
    a.margin += Number((o as any).margin ?? 0);
    agg.set(key, a);
  }

  return Array.from(agg.values())
    .sort((a, b) => b.selling_value - a.selling_value)
    .map((r) => ({
      order_type: r.order_type,
      order_count: r.order_count,
      selling_value: r.selling_value,
      direct_cost: r.direct_cost,
      margin: r.margin,
      margin_pct: r.selling_value > 0 ? (r.margin / r.selling_value) * 100 : 0,
    }));
}