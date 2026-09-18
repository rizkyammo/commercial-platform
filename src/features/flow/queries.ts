import { createClient } from "@/lib/supabase/server";

// ============================================================
// PROCUREMENT
// ============================================================
export async function listProcurements(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("procurements")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const vendorIds = Array.from(
    new Set(data.map((p) => p.vendor_id).filter(Boolean))
  );
  const { data: vendors } = vendorIds.length
    ? await supabase
        .from("vendors")
        .select("id, code, name")
        .in("id", vendorIds)
    : { data: [] };
  const vendorMap = new Map((vendors ?? []).map((v) => [v.id, v]));

  return data.map((p) => ({
    ...p,
    vendors: p.vendor_id ? vendorMap.get(p.vendor_id) ?? null : null,
  }));
}

export async function getProcurement(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("procurements")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { data: items } = await supabase
    .from("procurement_items")
    .select("*")
    .eq("procurement_id", id)
    .order("sort_order");

  const productIds = Array.from(
    new Set((items ?? []).map((i) => i.product_id).filter(Boolean))
  );
  const { data: products } = productIds.length
    ? await supabase
        .from("products")
        .select("id, code, name, uom")
        .in("id", productIds)
    : { data: [] };
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  return {
    ...data,
    items: (items ?? []).map((it) => ({
      ...it,
      products: productMap.get(it.product_id) ?? null,
    })),
  };
}

// ============================================================
// SHIPMENT
// ============================================================
export async function listShipments(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const transporterIds = Array.from(
    new Set(data.map((s) => s.transporter_id).filter(Boolean))
  );
  const { data: transporters } = transporterIds.length
    ? await supabase
        .from("transporters")
        .select("id, code, name")
        .in("id", transporterIds)
    : { data: [] };
  const tMap = new Map((transporters ?? []).map((t) => [t.id, t]));

  return data.map((s) => ({
    ...s,
    transporters: s.transporter_id
      ? tMap.get(s.transporter_id) ?? null
      : null,
  }));
}

export async function getShipment(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { data: items } = await supabase
    .from("shipment_items")
    .select("*")
    .eq("shipment_id", id)
    .order("sort_order");

  const productIds = Array.from(
    new Set((items ?? []).map((i) => i.product_id).filter(Boolean))
  );
  const { data: products } = productIds.length
    ? await supabase
        .from("products")
        .select("id, code, name, uom")
        .in("id", productIds)
    : { data: [] };
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  return {
    ...data,
    items: (items ?? []).map((it) => ({
      ...it,
      products: productMap.get(it.product_id) ?? null,
    })),
  };
}

// ============================================================
// DELIVERY
// ============================================================
export async function listDeliveries(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deliveries")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================
// BAST
// ============================================================
export async function listBasts(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("basts")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================
// SHIPPED QTY
// ============================================================
export async function getShippedQtyByProduct(orderId: string) {
  const supabase = await createClient();
  const { data: shipments } = await supabase
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "CONFIRMED");
  if (!shipments || shipments.length === 0) return new Map<string, number>();

  const shipmentIds = shipments.map((s) => s.id);
  const { data: items } = await supabase
    .from("shipment_items")
    .select("product_id, qty")
    .in("shipment_id", shipmentIds);

  const map = new Map<string, number>();
  for (const it of items ?? []) {
    map.set(it.product_id, (map.get(it.product_id) ?? 0) + Number(it.qty));
  }
  return map;
}

// ============================================================
// REFERENCE DATA
// ============================================================
export async function listVendorsSimple() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("vendors")
    .select("id, code, name")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

export async function listTransportersSimple() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("transporters")
    .select("id, code, name, plate_number")
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

// ============================================================
// FLOW HELPERS — derive effective stage
// ============================================================

const VALID_STAGES = [
  "PO",
  "COMPLIANCE",
  "PROCUREMENT",
  "SHIPMENT",
  "DELIVERY",
  "BAST",
  "COMPLETE",
] as const;

const FLOW_EXCLUDED_STATUSES = ["CANCELLED"] as const;

export type EffectiveStage =
  | "PO"
  | "COMPLIANCE"
  | "PROCUREMENT"
  | "SHIPMENT"
  | "DELIVERY"
  | "BAST"
  | "COMPLETE";

/**
 * Derive effective stage dari order.
 * Fallback ke status kalau current_stage tidak valid.
 */
export function deriveEffectiveStage(order: {
  current_stage: string | null;
  status: string;
  compliance_status: string;
  procurement_status: string;
  shipment_status: string;
  delivery_status: string;
  bast_status: string;
}): EffectiveStage {
  // 1) Pakai current_stage kalau valid
  if (
    order.current_stage &&
    (VALID_STAGES as readonly string[]).includes(order.current_stage)
  ) {
    return order.current_stage as EffectiveStage;
  }

  // 2) Fallback: derive dari status order
  switch (order.status) {
    case "DRAFT":
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "RETURNED":
      return "PO";
    case "APPROVED":
      return "PO";
    case "ISSUED":
      return "PROCUREMENT";
    case "IN_PROGRESS":
    case "PARTIALLY_FULFILLED":
      if (order.bast_status && order.bast_status !== "NOT_STARTED") return "BAST";
      if (order.delivery_status && order.delivery_status !== "NOT_STARTED") return "DELIVERY";
      if (order.shipment_status && order.shipment_status !== "NOT_STARTED") return "SHIPMENT";
      if (order.procurement_status && order.procurement_status !== "NOT_STARTED") return "PROCUREMENT";
      return "PROCUREMENT";
    case "FULFILLED":
      return "BAST";
    case "CLOSED":
      return "COMPLETE";
    default:
      return "PO";
  }
}

/**
 * Derive stage status untuk ditampilkan di kolom.
 */
export function deriveStageStatus(
  stage: EffectiveStage,
  order: {
    status: string;
    compliance_status: string;
    procurement_status: string;
    shipment_status: string;
    delivery_status: string;
    bast_status: string;
  }
): string {
  switch (stage) {
    case "PO":
      if (order.status === "APPROVED") return "APPROVED";
      if (order.status === "SUBMITTED") return "SUBMITTED";
      if (order.status === "UNDER_REVIEW") return "UNDER_REVIEW";
      if (order.status === "RETURNED") return "RETURNED";
      return "DRAFT";
    case "COMPLIANCE":
      return order.compliance_status;
    case "PROCUREMENT":
      return order.procurement_status;
    case "SHIPMENT":
      return order.shipment_status;
    case "DELIVERY":
      return order.delivery_status;
    case "BAST":
      return order.bast_status;
    case "COMPLETE":
      return "COMPLETED";
    default:
      return "NOT_STARTED";
  }
}

// ============================================================
// FLOW COUNTERS — ALL orders (bukan hanya aktif)
// ============================================================
export async function getFlowCounters() {
  const supabase = await createClient();

  const { data: orders, error } = await supabase
    .from("orders")
    .select(
      "id, status, current_stage, business_model, compliance_status, procurement_status, shipment_status, delivery_status, bast_status"
    )
    .not("status", "in", `(${FLOW_EXCLUDED_STATUSES.join(",")})`);

  if (error) {
    console.error("[getFlowCounters] error:", error);
    return {
      total: 0,
      byStage: {
        PO: 0,
        COMPLIANCE: 0,
        PROCUREMENT: 0,
        SHIPMENT: 0,
        DELIVERY: 0,
        BAST: 0,
        COMPLETE: 0,
        CONSIGNMENT: 0,
      },
      byStatus: {},
    };
  }

  const all = orders ?? [];

  const byStage: Record<string, number> = {
    PO: 0,
    COMPLIANCE: 0,
    PROCUREMENT: 0,
    SHIPMENT: 0,
    DELIVERY: 0,
    BAST: 0,
    COMPLETE: 0,
    CONSIGNMENT: 0,
  };

  const byStatus: Record<string, number> = {};

  for (const o of all) {
    const stage = deriveEffectiveStage(o as any);
    byStage[stage] = (byStage[stage] ?? 0) + 1;
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;

    if (
      ["Consignment", "Managed Inventory / VMI"].includes(o.business_model)
    ) {
      byStage.CONSIGNMENT += 1;
    }
  }

  return {
    total: all.length,
    byStage,
    byStatus,
  };
}

// ============================================================
// LIST FLOW ORDERS — ALL orders, derive stage
// ============================================================
export async function listFlowOrders({
  stage,
  view,
  q,
  page = 1,
  pageSize = 20,
}: {
  stage?: string;
  view?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = await createClient();

  // Ambil SEMUA order (kecuali CANCELLED) — kita derive stage di client
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, po_number, status, business_model, current_stage, selling_value, currency, created_at, updated_at, customer_id, site_id, compliance_status, procurement_status, shipment_status, delivery_status, bast_status",
      { count: "exact" }
    )
    .not("status", "in", `(${FLOW_EXCLUDED_STATUSES.join(",")})`)
    .order("updated_at", { ascending: false });

  if (q) query = query.or(`order_number.ilike.%${q}%,po_number.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[listFlowOrders] error:", error);
    throw error;
  }

  let orders = data ?? [];

  // Derive stage untuk setiap order
  const withStage = orders.map((o) => ({
    ...o,
    effective_stage: deriveEffectiveStage(o as any),
  }));

  // Filter by stage (di memory, karena derived)
  let filtered = withStage;
  if (stage && stage !== "all" && stage !== "CONSIGNMENT") {
    filtered = filtered.filter((o) => o.effective_stage === stage);
  }
  if (stage === "CONSIGNMENT") {
    filtered = filtered.filter((o) =>
      ["Consignment", "Managed Inventory / VMI"].includes(o.business_model)
    );
  }

  // Filter by view
  if (view && view !== "all") {
    filtered = filtered.filter((o) => {
      const stageStatus = deriveStageStatus(
        o.effective_stage as EffectiveStage,
        o as any
      );

      switch (view) {
        case "draft":
          return ["DRAFT", "NOT_STARTED"].includes(stageStatus);
        case "pending":
          return ["SUBMITTED", "UNDER_REVIEW"].includes(stageStatus);
        case "completed":
          return ["COMPLETED", "VERIFIED", "APPROVED"].includes(stageStatus);
        case "blocked":
          return (
            o.compliance_status === "NOT_STARTED" &&
            !["DRAFT", "SUBMITTED", "UNDER_REVIEW", "RETURNED", "APPROVED"].includes(
              o.status
            )
          );
        default:
          return true;
      }
    });
  }

  // Pagination
  const totalCount = filtered.length;
  const from = (page - 1) * pageSize;
  const to = from + pageSize;
  const paginated = filtered.slice(from, to);

  // Enrich dengan customer + site
  const customerIds = Array.from(
    new Set(paginated.map((o) => o.customer_id).filter(Boolean))
  );
  const siteIds = Array.from(
    new Set(paginated.map((o) => o.site_id).filter(Boolean))
  );

  const [customersRes, sitesRes] = await Promise.all([
    customerIds.length
      ? supabase
          .from("customers")
          .select("id, name, code")
          .in("id", customerIds)
      : Promise.resolve({
          data: [] as { id: string; name: string; code: string }[],
        }),
    siteIds.length
      ? supabase.from("sites").select("id, name, code").in("id", siteIds)
      : Promise.resolve({
          data: [] as { id: string; name: string; code: string }[],
        }),
  ]);

  const cmap = new Map((customersRes.data ?? []).map((c) => [c.id, c]));
  const smap = new Map((sitesRes.data ?? []).map((s) => [s.id, s]));

  return {
    data: paginated.map((o) => ({
      ...o,
      customers: cmap.get(o.customer_id) ?? null,
      sites: smap.get(o.site_id) ?? null,
    })),
    count: totalCount,
  };
}