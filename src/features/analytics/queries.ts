import { createClient } from "@/lib/supabase/server";

// ============================================================
// TIME RANGE
// ============================================================
export type TimeRange = {
  preset: "daily" | "monthly" | "yearly" | "all" | "custom";
  from?: string;
  to?: string;
};

export function resolveDateRange(range: TimeRange): {
  from: string;
  to: string;
} {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  if (range.preset === "custom" && range.from && range.to) {
    return { from: range.from, to: range.to };
  }

  if (range.preset === "all") {
    return { from: "2020-01-01", to: today };
  }

  const start = new Date();
  if (range.preset === "daily") start.setDate(start.getDate() - 30);
  else if (range.preset === "monthly") start.setMonth(start.getMonth() - 12);
  else if (range.preset === "yearly") start.setFullYear(start.getFullYear() - 5);

  return {
    from: start.toISOString().slice(0, 10),
    to: today,
  };
}

function resolvePrevRange(range: TimeRange): { from: string; to: string } {
  const current = resolveDateRange(range);
  const fromD = new Date(current.from);
  const toD = new Date(current.to);
  const days = Math.max(
    1,
    Math.ceil((toD.getTime() - fromD.getTime()) / 86400000)
  );

  const prevTo = new Date(fromD);
  prevTo.setDate(prevTo.getDate() - 1);
  const prevFrom = new Date(prevTo);
  prevFrom.setDate(prevFrom.getDate() - days);

  return {
    from: prevFrom.toISOString().slice(0, 10),
    to: prevTo.toISOString().slice(0, 10),
  };
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function deriveStage(o: {
  current_stage: string | null;
  status: string;
}): string {
  const valid = [
    "PO",
    "COMPLIANCE",
    "PROCUREMENT",
    "SHIPMENT",
    "DELIVERY",
    "BAST",
    "COMPLETE",
  ];
  if (o.current_stage && valid.includes(o.current_stage)) return o.current_stage;
  switch (o.status) {
    case "DRAFT":
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "RETURNED":
    case "APPROVED":
      return "PO";
    case "ISSUED":
    case "IN_PROGRESS":
    case "PARTIALLY_FULFILLED":
      return "PROCUREMENT";
    case "FULFILLED":
      return "BAST";
    case "CLOSED":
      return "COMPLETE";
    default:
      return "PO";
  }
}

// ============================================================
// COMPLIANCE OVERVIEW HELPER
// ============================================================
async function getComplianceOverview() {
  const supabase = await createClient();

  const { data: sk } = await supabase
    .from("kemhan_authorizations")
    .select("id, sk_number, expiry_date, status")
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!sk) {
    return {
      activeSk: null,
      allocation: 0,
      realized: 0,
      committed: 0,
      available: 0,
      utilization: 0,
    };
  }

  const { data: lines } = await supabase
    .from("kemhan_quota_lines")
    .select("id, allocation_qty")
    .eq("authorization_id", sk.id);

  const lineIds = (lines ?? []).map((l) => l.id);
  const { data: ledger } = lineIds.length
    ? await supabase
        .from("kemhan_quota_ledger")
        .select("quota_line_id, qty, transaction_type")
        .in("quota_line_id", lineIds)
    : { data: [] };

  let allocated = 0;
  let committed = 0;
  let realized = 0;
  for (const l of lines ?? []) allocated += Number(l.allocation_qty ?? 0);
  for (const e of ledger ?? []) {
    const q = Number(e.qty);
    if (e.transaction_type === "PO_COMMITMENT") committed += -q;
    if (e.transaction_type === "PO_RELEASE") committed -= q;
    if (e.transaction_type === "DISTRIBUTION_REALIZATION") realized += -q;
  }

  const available = allocated - committed - realized;
  const utilization =
    allocated > 0 ? ((committed + realized) / allocated) * 100 : 0;

  return {
    activeSk: sk,
    allocation: allocated,
    realized: Math.max(0, realized),
    committed: Math.max(0, committed),
    available: Math.max(0, available),
    utilization,
  };
}

// ============================================================
// GET ANALYTICS OVERVIEW
// Simple KPI-only function — dipakai untuk custom report / quick stats
// ============================================================
export async function getAnalyticsOverview(range: TimeRange) {
  const supabase = await createClient();
  const { from, to } = resolveDateRange(range);

  const { data: rows, error } = await supabase
    .from("orders")
    .select(
      "selling_value, total_direct_cost, margin, margin_before_tax, margin_after_tax, ppn_output, ppn_input, ppn_payable, pph23_amount, total_tax, status, created_at, bast_status"
    )
    .neq("status", "CANCELLED")
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59");

  if (error) console.error("[getAnalyticsOverview]", error);
  const all = rows ?? [];

  const selling = all.reduce((a, r) => a + Number(r.selling_value ?? 0), 0);
  const cost = all.reduce((a, r) => a + Number(r.total_direct_cost ?? 0), 0);
  const margin = selling - cost;
  const marginPct = selling > 0 ? (margin / selling) * 100 : 0;

  const ppnOutput = all.reduce((a, r) => a + Number(r.ppn_output ?? 0), 0);
  const ppnInput = all.reduce((a, r) => a + Number(r.ppn_input ?? 0), 0);
  const ppnPayable = all.reduce((a, r) => a + Number(r.ppn_payable ?? 0), 0);
  const pph23 = all.reduce((a, r) => a + Number(r.pph23_amount ?? 0), 0);
  const totalTax = all.reduce((a, r) => a + Number(r.total_tax ?? 0), 0);
  const marginAfterTax = all.reduce(
    (a, r) => a + Number(r.margin_after_tax ?? 0),
    0
  );
  const marginPctAfterTax =
    selling > 0 ? (marginAfterTax / selling) * 100 : 0;

  const active = all.filter((r) =>
    ["ISSUED", "IN_PROGRESS", "PARTIALLY_FULFILLED"].includes(r.status)
  ).length;
  const completed = all.filter((r) =>
    ["FULFILLED", "CLOSED"].includes(r.status)
  ).length;
  const waitingBast = all.filter(
    (r) =>
      ["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"].includes(r.status) &&
      r.bast_status !== "COMPLETED"
  ).length;
  const complianceBlocked = all.filter(
    (r) => r.status === "APPROVED"
  ).length;

  return {
    range: { from, to },
    orderCount: all.length,
    orderValue: selling,
    directCost: cost,
    margin,
    marginPct,
    marginBeforeTax: margin,
    marginAfterTax,
    marginPctAfterTax,
    ppnOutput,
    ppnInput,
    ppnPayable,
    pph23,
    totalTax,
    activeOrders: active,
    completedOrders: completed,
    waitingBast,
    complianceBlocked,
    drafts: all.filter((r) => r.status === "DRAFT").length,
    submitted: all.filter((r) => r.status === "SUBMITTED").length,
    approved: all.filter((r) => r.status === "APPROVED").length,
    issued: all.filter((r) => r.status === "ISSUED").length,
    closed: all.filter((r) => r.status === "CLOSED").length,
  };
}

// ============================================================
// GET ANALYTICS DASHBOARD
// Full dashboard data (single-page layout)
// ============================================================
export async function getAnalyticsDashboard(range: TimeRange) {
  const supabase = await createClient();
  const { from, to } = resolveDateRange(range);
  const prev = resolvePrevRange(range);

  const [{ data: currOrders }, { data: prevOrders }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_id, site_id, status, business_model, current_stage, selling_value, total_direct_cost, margin, margin_before_tax, margin_after_tax, ppn_output, ppn_input, ppn_payable, pph23_amount, total_tax, created_at, submitted_at, approved_at, issued_at, compliance_status, procurement_status, shipment_status, delivery_status, bast_status"
      )
      .neq("status", "CANCELLED")
      .gte("created_at", from)
      .lte("created_at", to + "T23:59:59"),
    supabase
      .from("orders")
      .select(
        "selling_value, total_direct_cost, margin, status, created_at, submitted_at, approved_at, issued_at, bast_status"
      )
      .neq("status", "CANCELLED")
      .gte("created_at", prev.from)
      .lte("created_at", prev.to + "T23:59:59"),
  ]);

  const current = currOrders ?? [];
  const previous = prevOrders ?? [];

  const sum = (
    rows: Array<Record<string, unknown>>,
    key: string
  ): number =>
    rows.reduce((a, r) => a + Number((r as Record<string, number>)[key] ?? 0), 0);

  const currOrderValue = sum(current, "selling_value");
  const prevOrderValue = sum(previous, "selling_value");

  const currDirectCost = sum(current, "total_direct_cost");
  const prevDirectCost = sum(previous, "total_direct_cost");

  const currMargin = currOrderValue - currDirectCost;
  const prevMargin = prevOrderValue - prevDirectCost;

  const currMarginPct =
    currOrderValue > 0 ? (currMargin / currOrderValue) * 100 : 0;
  const prevMarginPct =
    prevOrderValue > 0 ? (prevMargin / prevOrderValue) * 100 : 0;

  // Tax aggregates
  const currPpnOutput = sum(current, "ppn_output");
  const currPpnInput = sum(current, "ppn_input");
  const currPpnPayable = sum(current, "ppn_payable");
  const currPph23 = sum(current, "pph23_amount");
  const currTotalTax = sum(current, "total_tax");
  const currMarginAfterTax = sum(current, "margin_after_tax");
  const currMarginPctAfterTax =
    currOrderValue > 0 ? (currMarginAfterTax / currOrderValue) * 100 : 0;

  const prevPpnPayable = sum(previous, "ppn_payable");
  const prevPph23 = sum(previous, "pph23_amount");
  const prevTotalTax = sum(previous, "total_tax");
  const prevMarginAfterTax = sum(previous, "margin_after_tax");

  const currActive = current.filter((o) =>
    ["ISSUED", "IN_PROGRESS", "PARTIALLY_FULFILLED"].includes(o.status)
  ).length;
  const prevActive = previous.filter((o) =>
    ["ISSUED", "IN_PROGRESS", "PARTIALLY_FULFILLED"].includes(o.status)
  ).length;

  const currCompleted = current.filter((o) =>
    ["FULFILLED", "CLOSED"].includes(o.status)
  ).length;
  const prevCompleted = previous.filter((o) =>
    ["FULFILLED", "CLOSED"].includes(o.status)
  ).length;

  const currWaitingBast = current.filter(
    (o) =>
      ["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"].includes(o.status) &&
      o.bast_status !== "COMPLETED"
  ).length;
  const prevWaitingBast = previous.filter(
    (o) =>
      ["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"].includes(o.status) &&
      o.bast_status !== "COMPLETED"
  ).length;

  const kpis = {
    orderValue: {
      value: currOrderValue,
      delta: pctDelta(currOrderValue, prevOrderValue),
    },
    directCost: {
      value: currDirectCost,
      delta: pctDelta(currDirectCost, prevDirectCost),
    },
    margin: {
      value: currMargin,
      pct: currMarginPct,
      deltaPts: currMarginPct - prevMarginPct,
    },
    marginAfterTax: {
      value: currMarginAfterTax,
      pct: currMarginPctAfterTax,
      delta: pctDelta(currMarginAfterTax, prevMarginAfterTax),
    },
    ppnPayable: {
      value: currPpnPayable,
      delta: pctDelta(currPpnPayable, prevPpnPayable),
    },
    pph23: {
      value: currPph23,
      delta: pctDelta(currPph23, prevPph23),
    },
    totalTax: {
      value: currTotalTax,
      delta: pctDelta(currTotalTax, prevTotalTax),
    },
    activeOrders: {
      value: currActive,
      delta: pctDelta(currActive, prevActive),
    },
    completedOrders: {
      value: currCompleted,
      delta: pctDelta(currCompleted, prevCompleted),
    },
    waitingBast: {
      value: currWaitingBast,
      deltaPct: currWaitingBast - prevWaitingBast,
    },
  };

  // ============ TREND ============
  const trendMap = new Map<
    string,
    { period: string; orderValue: number; margin: number; marginPct: number }
  >();
  for (const o of current) {
    const month = (o.created_at as string).slice(0, 7);
    const agg = trendMap.get(month) ?? {
      period: month,
      orderValue: 0,
      margin: 0,
      marginPct: 0,
    };
    agg.orderValue += Number(o.selling_value ?? 0);
    agg.margin +=
      Number(o.selling_value ?? 0) - Number(o.total_direct_cost ?? 0);
    trendMap.set(month, agg);
  }
  const trend = Array.from(trendMap.values())
    .map((t) => ({
      ...t,
      marginPct: t.orderValue > 0 ? (t.margin / t.orderValue) * 100 : 0,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // ============ ORDERS BY STAGE ============
  const stageCounts: Record<string, number> = {};
  for (const o of current) {
    const stage = deriveStage(o);
    stageCounts[stage] = (stageCounts[stage] ?? 0) + 1;
  }
  const ordersByStage = Object.entries(stageCounts).map(([stage, count]) => ({
    stage,
    count,
  }));

  // ============ ORDERS BY CUSTOMER ============
  const customerIds = Array.from(
    new Set(current.map((o) => o.customer_id).filter(Boolean))
  );
  const { data: customers } = customerIds.length
    ? await supabase
        .from("customers")
        .select("id, code, name")
        .in("id", customerIds)
    : { data: [] };
  const cmap = new Map((customers ?? []).map((c) => [c.id, c]));

  const custCounts = new Map<string, { name: string; count: number }>();
  for (const o of current) {
    const c = cmap.get(o.customer_id);
    if (!c) continue;
    const agg = custCounts.get(c.id) ?? { name: c.name, count: 0 };
    agg.count += 1;
    custCounts.set(c.id, agg);
  }
  const ordersByCustomer = Array.from(custCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // ============ MARGIN BY SITE ============
  const siteIds = Array.from(
    new Set(current.map((o) => o.site_id).filter(Boolean))
  );
  const { data: sites } = siteIds.length
    ? await supabase.from("sites").select("id, code, name").in("id", siteIds)
    : { data: [] };
  const smap = new Map((sites ?? []).map((s) => [s.id, s]));

  const siteAgg = new Map<
    string,
    {
      site_name: string;
      order_value: number;
      direct_cost: number;
      margin: number;
    }
  >();
  for (const o of current) {
    const s = smap.get(o.site_id);
    if (!s) continue;
    const agg = siteAgg.get(s.id) ?? {
      site_name: s.name,
      order_value: 0,
      direct_cost: 0,
      margin: 0,
    };
    agg.order_value += Number(o.selling_value ?? 0);
    agg.direct_cost += Number(o.total_direct_cost ?? 0);
    agg.margin +=
      Number(o.selling_value ?? 0) - Number(o.total_direct_cost ?? 0);
    siteAgg.set(s.id, agg);
  }
  const marginBySite = Array.from(siteAgg.values())
    .sort((a, b) => b.margin - a.margin)
    .slice(0, 5)
    .map((s) => ({
      ...s,
      margin_pct: s.order_value > 0 ? (s.margin / s.order_value) * 100 : 0,
    }));

  // ============ MARGIN BY PRODUCT ============
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("order_id, product_id, qty, line_value, products(name, code)")
    .in(
      "order_id",
      current.map((o) => o.id)
    );

  const prodAgg = new Map<
    string,
    { product_name: string; order_value: number; total_qty: number }
  >();
  for (const oi of orderItems ?? []) {
    const p = (oi.products as { name?: string; code?: string } | null) ?? null;
    const key = p?.code ?? oi.product_id;
    const agg = prodAgg.get(key) ?? {
      product_name: p?.name ?? "—",
      order_value: 0,
      total_qty: 0,
    };
    agg.order_value += Number(oi.line_value ?? 0);
    agg.total_qty += Number(oi.qty ?? 0);
    prodAgg.set(key, agg);
  }
  const marginByProduct = Array.from(prodAgg.values())
    .sort((a, b) => b.order_value - a.order_value)
    .slice(0, 5);

  // ============ CYCLE TIME ============
  const days = (a: string | null, b: string | null) =>
    a && b ? (new Date(a).getTime() - new Date(b).getTime()) / 86400000 : null;

  const avg = (vals: (number | null)[]) => {
    const clean = vals.filter((v): v is number => v !== null && v >= 0);
    return clean.length > 0 ? clean.reduce((a, b) => a + b, 0) / clean.length : 0;
  };

  const createToSubmit = avg(
    current.map((o) => days(o.submitted_at, o.created_at))
  );
  const submitToApprove = avg(
    current.map((o) => days(o.approved_at, o.submitted_at))
  );
  const approveToIssue = avg(
    current.map((o) => days(o.issued_at, o.approved_at))
  );

  const prevCreateToSubmit = avg(
    (previous as unknown as typeof current).map((o) =>
      days(o.submitted_at, o.created_at)
    )
  );
  const prevSubmitToApprove = avg(
    (previous as unknown as typeof current).map((o) =>
      days(o.approved_at, o.submitted_at)
    )
  );
  const prevApproveToIssue = avg(
    (previous as unknown as typeof current).map((o) =>
      days(o.issued_at, o.approved_at)
    )
  );

  const cycleTime = {
    poToProcurement: {
      days: createToSubmit,
      delta: createToSubmit - prevCreateToSubmit,
    },
    procurementToShipment: {
      days: submitToApprove,
      delta: submitToApprove - prevSubmitToApprove,
    },
    shipmentToDelivery: {
      days: approveToIssue,
      delta: approveToIssue - prevApproveToIssue,
    },
    deliveryToBast: { days: 0, delta: 0 },
  };

  // ============ COMPLIANCE ============
  const compliance = await getComplianceOverview();

  // ============ TOP ISSUES ============
  const topIssues: {
    label: string;
    count: number;
    tone: "red" | "yellow" | "grey";
  }[] = [];

  const waiting7 = current.filter((o) => {
    if (o.bast_status === "COMPLETED") return false;
    if (!["IN_PROGRESS", "PARTIALLY_FULFILLED", "FULFILLED"].includes(o.status))
      return false;
    const age = (Date.now() - new Date(o.created_at).getTime()) / 86400000;
    return age > 7;
  }).length;
  if (waiting7 > 0)
    topIssues.push({
      label: "Orders waiting BAST > 7 days",
      count: waiting7,
      tone: "red",
    });

  const blocked = current.filter(
    (o) => o.status === "APPROVED" && o.compliance_status !== "COMPLETED"
  ).length;
  if (blocked > 0)
    topIssues.push({
      label: "Orders blocked by compliance",
      count: blocked,
      tone: "red",
    });

  if (compliance.utilization >= 90)
    topIssues.push({
      label: "Quota nearing limit (≤ 10%)",
      count: 1,
      tone: "yellow",
    });

  if (compliance.activeSk?.expiry_date) {
    const daysToExpiry =
      (new Date(compliance.activeSk.expiry_date).getTime() - Date.now()) /
      86400000;
    if (daysToExpiry <= 30 && daysToExpiry > 0)
      topIssues.push({
        label: "SK expiring in ≤ 30 days",
        count: 1,
        tone: "yellow",
      });
  }

  const procDelayed = current.filter((o) => {
    if (o.status !== "ISSUED") return false;
    const age = (Date.now() - new Date(o.created_at).getTime()) / 86400000;
    return age > 14;
  }).length;
  if (procDelayed > 0)
    topIssues.push({
      label: "Procurement delayed > 14 days",
      count: procDelayed,
      tone: "grey",
    });

  // ============ QUICK INSIGHTS ============
  const quickInsights: string[] = [];
  const kpiDelta = kpis.orderValue.delta;
  if (Math.abs(kpiDelta) > 0.5) {
    quickInsights.push(
      `Order value ${kpiDelta >= 0 ? "increased" : "decreased"} by ${Math.abs(kpiDelta).toFixed(1)}% compared to previous period.`
    );
  }
  const marginDeltaPts = kpis.margin.deltaPts;
  if (Math.abs(marginDeltaPts) > 0.1) {
    quickInsights.push(
      `Margin ${marginDeltaPts >= 0 ? "improved" : "declined"} by ${Math.abs(marginDeltaPts).toFixed(1)} percentage points.`
    );
  }
  if (kpis.waitingBast.value > 0) {
    quickInsights.push(
      `${kpis.waitingBast.value} order(s) currently waiting for BAST completion.`
    );
  }
  if (compliance.utilization > 0) {
    quickInsights.push(
      `Compliance quota utilization at ${compliance.utilization.toFixed(0)}%.`
    );
  }
  if (currTotalTax > 0) {
    quickInsights.push(
      `Total tax liability (PPN + PPh 23) this period: ${currTotalTax.toLocaleString("id-ID", { maximumFractionDigits: 0 })}.`
    );
  }

  return {
    range: { from, to, prevFrom: prev.from, prevTo: prev.to },
    kpis,
    taxTotals: {
      ppnOutput: currPpnOutput,
      ppnInput: currPpnInput,
      ppnPayable: currPpnPayable,
      pph23: currPph23,
      totalTax: currTotalTax,
    },
    trend,
    ordersByStage,
    ordersByCustomer,
    marginBySite,
    marginByProduct,
    cycleTime,
    compliance,
    topIssues,
    quickInsights,
    orderCount: current.length,
  };
}

// ============================================================
// DRILL-DOWN — full list per dimensi (tanpa limit)
// ============================================================
export type DimensionType =
  | "margin-by-site"
  | "margin-by-customer"
  | "margin-by-product"
  | "orders-by-customer";

export type DetailRow = Record<string, string | number>;

export type DimensionResult = {
  title: string;
  description: string;
  columns: {
    key: string;
    label: string;
    align?: "left" | "right";
    format?: "number" | "money" | "percent";
  }[];
  rows: DetailRow[];
};

export async function getAnalyticsDimension(
  dimension: DimensionType,
  range: TimeRange
): Promise<DimensionResult> {
  const supabase = await createClient();
  const { from, to } = resolveDateRange(range);

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, order_number, customer_id, site_id, status, business_model, current_stage, selling_value, total_direct_cost, margin, created_at"
    )
    .neq("status", "CANCELLED")
    .gte("created_at", from)
    .lte("created_at", to + "T23:59:59");

  const list = orders ?? [];

  switch (dimension) {
    // ---------------------------------------------------------
    case "margin-by-site": {
      const siteIds = Array.from(
        new Set(list.map((o) => o.site_id).filter(Boolean))
      );
      const { data: sites } = siteIds.length
        ? await supabase
            .from("sites")
            .select("id, code, name, customers(name)")
            .in("id", siteIds)
        : { data: [] as unknown[] };

      const smap = new Map(
        ((sites ?? []) as Array<{
          id: string;
          code: string;
          name: string;
          customers?: { name?: string } | null;
        }>).map((s) => [s.id, s])
      );

      const agg = new Map<
        string,
        {
          site_name: string;
          site_code: string;
          customer_name: string;
          order_count: number;
          order_value: number;
          direct_cost: number;
          margin: number;
        }
      >();

      for (const o of list) {
        const s = smap.get(o.site_id);
        if (!s) continue;
        const a = agg.get(s.id) ?? {
          site_name: s.name,
          site_code: s.code,
          customer_name: s.customers?.name ?? "—",
          order_count: 0,
          order_value: 0,
          direct_cost: 0,
          margin: 0,
        };
        a.order_count += 1;
        a.order_value += Number(o.selling_value ?? 0);
        a.direct_cost += Number(o.total_direct_cost ?? 0);
        a.margin +=
          Number(o.selling_value ?? 0) - Number(o.total_direct_cost ?? 0);
        agg.set(s.id, a);
      }

      const rows = Array.from(agg.values())
        .sort((a, b) => b.margin - a.margin)
        .map((s) => ({
          site_name: s.site_name,
          site_code: s.site_code,
          customer_name: s.customer_name,
          order_count: s.order_count,
          order_value: s.order_value,
          direct_cost: s.direct_cost,
          margin: s.margin,
          margin_pct:
            s.order_value > 0 ? (s.margin / s.order_value) * 100 : 0,
        }));

      return {
        title: "Margin by Site",
        description: `Detail lengkap per site · ${from} → ${to}`,
        columns: [
          { key: "site_name", label: "Site" },
          { key: "site_code", label: "Code" },
          { key: "customer_name", label: "Customer" },
          {
            key: "order_count",
            label: "Orders",
            align: "right",
            format: "number",
          },
          {
            key: "order_value",
            label: "Order Value",
            align: "right",
            format: "money",
          },
          {
            key: "direct_cost",
            label: "Direct Cost",
            align: "right",
            format: "money",
          },
          { key: "margin", label: "Margin", align: "right", format: "money" },
          {
            key: "margin_pct",
            label: "Margin %",
            align: "right",
            format: "percent",
          },
        ],
        rows,
      };
    }

    // ---------------------------------------------------------
    case "margin-by-customer": {
      const customerIds = Array.from(
        new Set(list.map((o) => o.customer_id).filter(Boolean))
      );
      const { data: customers } = customerIds.length
        ? await supabase
            .from("customers")
            .select("id, code, name")
            .in("id", customerIds)
        : { data: [] };

      const cmap = new Map((customers ?? []).map((c) => [c.id, c]));

      const agg = new Map<
        string,
        {
          customer_name: string;
          customer_code: string;
          order_count: number;
          order_value: number;
          direct_cost: number;
          margin: number;
        }
      >();

      for (const o of list) {
        const c = cmap.get(o.customer_id);
        if (!c) continue;
        const a = agg.get(c.id) ?? {
          customer_name: c.name,
          customer_code: c.code,
          order_count: 0,
          order_value: 0,
          direct_cost: 0,
          margin: 0,
        };
        a.order_count += 1;
        a.order_value += Number(o.selling_value ?? 0);
        a.direct_cost += Number(o.total_direct_cost ?? 0);
        a.margin +=
          Number(o.selling_value ?? 0) - Number(o.total_direct_cost ?? 0);
        agg.set(c.id, a);
      }

      const rows = Array.from(agg.values())
        .sort((a, b) => b.order_value - a.order_value)
        .map((c) => ({
          customer_name: c.customer_name,
          customer_code: c.customer_code,
          order_count: c.order_count,
          order_value: c.order_value,
          direct_cost: c.direct_cost,
          margin: c.margin,
          margin_pct:
            c.order_value > 0 ? (c.margin / c.order_value) * 100 : 0,
        }));

      return {
        title: "Margin by Customer",
        description: `Detail lengkap per customer · ${from} → ${to}`,
        columns: [
          { key: "customer_name", label: "Customer" },
          { key: "customer_code", label: "Code" },
          {
            key: "order_count",
            label: "Orders",
            align: "right",
            format: "number",
          },
          {
            key: "order_value",
            label: "Order Value",
            align: "right",
            format: "money",
          },
          {
            key: "direct_cost",
            label: "Direct Cost",
            align: "right",
            format: "money",
          },
          { key: "margin", label: "Margin", align: "right", format: "money" },
          {
            key: "margin_pct",
            label: "Margin %",
            align: "right",
            format: "percent",
          },
        ],
        rows,
      };
    }

    // ---------------------------------------------------------
    case "margin-by-product": {
      const orderIds = list.map((o) => o.id);
      const { data: items } = orderIds.length
        ? await supabase
            .from("order_items")
            .select(
              "order_id, product_id, qty, line_value, products(name, code, uom)"
            )
            .in("order_id", orderIds)
        : { data: [] };

      const agg = new Map<
        string,
        {
          product_name: string;
          product_code: string;
          uom: string;
          total_qty: number;
          order_value: number;
          order_ids: Set<string>;
        }
      >();

      for (const it of items ?? []) {
        const p =
          (it.products as
            | { name?: string; code?: string; uom?: string }
            | null) ?? null;
        const key = p?.code ?? it.product_id;
        const a = agg.get(key) ?? {
          product_name: p?.name ?? "—",
          product_code: p?.code ?? "—",
          uom: p?.uom ?? "—",
          total_qty: 0,
          order_value: 0,
          order_ids: new Set<string>(),
        };
        a.total_qty += Number(it.qty ?? 0);
        a.order_value += Number(it.line_value ?? 0);
        a.order_ids.add(it.order_id);
        agg.set(key, a);
      }

      const rows = Array.from(agg.values())
        .sort((a, b) => b.order_value - a.order_value)
        .map((p) => ({
          product_name: p.product_name,
          product_code: p.product_code,
          uom: p.uom,
          order_count: p.order_ids.size,
          total_qty: p.total_qty,
          order_value: p.order_value,
        }));

      return {
        title: "Margin by Product",
        description: `Detail lengkap per product · ${from} → ${to}`,
        columns: [
          { key: "product_name", label: "Product" },
          { key: "product_code", label: "Code" },
          { key: "uom", label: "UOM" },
          {
            key: "order_count",
            label: "Orders",
            align: "right",
            format: "number",
          },
          {
            key: "total_qty",
            label: "Total Qty",
            align: "right",
            format: "number",
          },
          {
            key: "order_value",
            label: "Order Value",
            align: "right",
            format: "money",
          },
        ],
        rows,
      };
    }

    // ---------------------------------------------------------
    case "orders-by-customer": {
      const customerIds = Array.from(
        new Set(list.map((o) => o.customer_id).filter(Boolean))
      );
      const { data: customers } = customerIds.length
        ? await supabase
            .from("customers")
            .select("id, code, name")
            .in("id", customerIds)
        : { data: [] };

      const cmap = new Map((customers ?? []).map((c) => [c.id, c]));

      const agg = new Map<
        string,
        {
          customer_name: string;
          customer_code: string;
          order_count: number;
          active_count: number;
          completed_count: number;
          order_value: number;
          margin: number;
        }
      >();

      for (const o of list) {
        const c = cmap.get(o.customer_id);
        if (!c) continue;
        const a = agg.get(c.id) ?? {
          customer_name: c.name,
          customer_code: c.code,
          order_count: 0,
          active_count: 0,
          completed_count: 0,
          order_value: 0,
          margin: 0,
        };
        a.order_count += 1;
        if (
          ["ISSUED", "IN_PROGRESS", "PARTIALLY_FULFILLED"].includes(o.status)
        )
          a.active_count += 1;
        if (["FULFILLED", "CLOSED"].includes(o.status)) a.completed_count += 1;
        a.order_value += Number(o.selling_value ?? 0);
        a.margin +=
          Number(o.selling_value ?? 0) - Number(o.total_direct_cost ?? 0);
        agg.set(c.id, a);
      }

      const rows = Array.from(agg.values())
        .sort((a, b) => b.order_count - a.order_count)
        .map((c) => ({
          customer_name: c.customer_name,
          customer_code: c.customer_code,
          order_count: c.order_count,
          active_count: c.active_count,
          completed_count: c.completed_count,
          order_value: c.order_value,
          margin: c.margin,
        }));

      return {
        title: "Orders by Customer",
        description: `Detail lengkap order per customer · ${from} → ${to}`,
        columns: [
          { key: "customer_name", label: "Customer" },
          { key: "customer_code", label: "Code" },
          {
            key: "order_count",
            label: "Total Orders",
            align: "right",
            format: "number",
          },
          {
            key: "active_count",
            label: "Active",
            align: "right",
            format: "number",
          },
          {
            key: "completed_count",
            label: "Completed",
            align: "right",
            format: "number",
          },
          {
            key: "order_value",
            label: "Order Value",
            align: "right",
            format: "money",
          },
          { key: "margin", label: "Margin", align: "right", format: "money" },
        ],
        rows,
      };
    }
  }
}

// ============================================================
// FILTER OPTIONS — untuk Report Builder & filter dropdown
// ============================================================
export async function getAnalyticsFilterOptions() {
  const supabase = await createClient();
  const [customers, sites, contracts, products] = await Promise.all([
    supabase
      .from("customers")
      .select("id, code, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("sites")
      .select("id, code, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("contracts")
      .select("id, code, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("products")
      .select("id, code, name")
      .eq("is_active", true)
      .order("name"),
  ]);

  return {
    customers: customers.data ?? [],
    sites: sites.data ?? [],
    contracts: contracts.data ?? [],
    products: products.data ?? [],
  };
}