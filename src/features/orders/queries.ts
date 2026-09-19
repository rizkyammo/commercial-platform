import { createClient } from "@/lib/supabase/server";

export type OrderListParams = {
  q?: string;
  status?: string;
  customerId?: string;
  page: number;
  pageSize: number;
};

// ============================================================
// LIST ORDERS
// ============================================================
export async function listOrders({
  q,
  status,
  customerId,
  page,
  pageSize,
}: OrderListParams) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select(
      "id, order_number, po_number, po_date, status, business_model, currency, selling_value, margin, current_stage, created_at, updated_at, customer_id, site_id, amendment_count, last_amendment_from_status",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.or(`order_number.ilike.%${q}%,po_number.ilike.%${q}%`);
  if (status && status !== "all") query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data: ordersRaw, count, error } = await query;
  if (error) throw error;

  const orders = ordersRaw ?? [];

  const customerIds = Array.from(
    new Set(orders.map((o) => o.customer_id).filter(Boolean))
  );
  const siteIds = Array.from(
    new Set(orders.map((o) => o.site_id).filter(Boolean))
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

  const customerMap = new Map((customersRes.data ?? []).map((c) => [c.id, c]));
  const siteMap = new Map((sitesRes.data ?? []).map((s) => [s.id, s]));

  const enriched = orders.map((o) => ({
    ...o,
    customers: customerMap.get(o.customer_id) ?? null,
    sites: siteMap.get(o.site_id) ?? null,
  }));

  return { data: enriched, count: count ?? 0 };
}

// ============================================================
// GET ORDER (defensive — split query untuk hindari join ambiguity)
// ============================================================
export async function getOrder(id: string) {
  const supabase = await createClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[getOrder] error:", error);
    throw new Error(`Failed to load order: ${error.message}`);
  }
  if (!order) {
    console.warn("[getOrder] no order for id:", id);
    return null;
  }

  const [customerRes, siteRes, contractRes] = await Promise.all([
    order.customer_id
      ? supabase.from("customers").select("id, code, name").eq("id", order.customer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.site_id
      ? supabase.from("sites").select("id, code, name").eq("id", order.site_id).maybeSingle()
      : Promise.resolve({ data: null }),
    order.contract_id
      ? supabase.from("contracts").select("id, code, name, currency").eq("id", order.contract_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    ...order,
    customers: customerRes.data ?? null,
    sites: siteRes.data ?? null,
    contracts: contractRes.data ?? null,
  };
}

// ============================================================
// ORDER ITEMS
// ============================================================
export async function getOrderItems(orderId: string) {
  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("sort_order");

  if (error) {
    console.error("[getOrderItems] error:", error);
    return [];
  }
  if (!items || items.length === 0) return [];

  const productIds = Array.from(new Set(items.map((i) => i.product_id).filter(Boolean)));
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, code, name, uom").in("id", productIds)
    : { data: [] as { id: string; code: string; name: string; uom: string }[] };

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  return items.map((it) => ({
    ...it,
    products: productMap.get(it.product_id) ?? null,
  }));
}

// ============================================================
// HISTORY
// ============================================================
export async function getOrderHistory(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================
// APPROVALS
// ============================================================
export async function getOrderApprovals(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================
// COUNTERS
// ============================================================
export async function getOrderCounters() {
  const supabase = await createClient();

  const statuses = [
    "DRAFT",
    "SUBMITTED",
    "UNDER_REVIEW",
    "RETURNED",
    "APPROVED",
    "ISSUED",
    "IN_PROGRESS",
    "PARTIALLY_FULFILLED",
    "FULFILLED",
    "CLOSED",
    "CANCELLED",
  ] as const;

  const counts: Record<string, number> = {};

  await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", s);
      counts[s] = count ?? 0;
    })
  );

  const { count: total } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  return { total: total ?? 0, byStatus: counts };
}

// ============================================================
// 🔥 REFERENCE DATA — CACHED 5 MENIT
// ============================================================
// ============================================================
// REFERENCE DATA
// ============================================================
export async function getReferenceData() {
  const supabase = await createClient();
  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, code, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("products")
      .select("id, code, name, uom")
      .eq("is_active", true)
      .order("name"),
  ]);
  return {
    customers: customers ?? [],
    products: products ?? [],
  };
}

// ============================================================
// SITES BY CUSTOMER
// ============================================================
export async function getSitesByCustomer(customerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("id, code, name")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}

// ============================================================
// CONTRACTS BY CUSTOMER
// ============================================================
export async function getContractsByCustomer(customerId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contracts")
    .select("id, code, name, currency, status")
    .eq("customer_id", customerId)
    .eq("is_active", true)
    .order("name");
  return data ?? [];
}
// ============================================================
// ORDER COMPLIANCE STATUS
// Return: SK aktif + status material (authorized? sufficient?)
// ============================================================
export async function getOrderComplianceStatus(orderId: string, skId: string | null) {
  const supabase = await createClient();

  // 1) Order items
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, qty, products(name, code, uom)")
    .eq("order_id", orderId);

  if (!items || items.length === 0) return { items: [], sk: null };

  // 2) SK (dari order atau latest ACTIVE)
  let sk = null;
  if (skId) {
    const { data } = await supabase
      .from("kemhan_authorizations")
      .select("id, sk_number, status, expiry_date, effective_date, issuing_authority")
      .eq("id", skId)
      .maybeSingle();
    sk = data;
  } else {
    const { data } = await supabase
      .from("kemhan_authorizations")
      .select("id, sk_number, status, expiry_date, effective_date, issuing_authority")
      .eq("status", "ACTIVE")
      .order("effective_date", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    sk = data;
  }

  if (!sk) return { items: [], sk: null };

  // 3) Quota lines untuk SK ini
  const { data: lines } = await supabase
    .from("kemhan_quota_lines")
    .select("id, product_id, allocation_qty, uom")
    .eq("authorization_id", sk.id);

  const lineMap = new Map((lines ?? []).map((l) => [l.product_id, l]));

  // 4) Ledger untuk compute available
  const lineIds = (lines ?? []).map((l) => l.id);
  const { data: ledger } = lineIds.length
    ? await supabase
        .from("kemhan_quota_ledger")
        .select("quota_line_id, qty")
        .in("quota_line_id", lineIds)
    : { data: [] as { quota_line_id: string; qty: number }[] };

  const availMap = new Map<string, number>();
  for (const l of lines ?? []) availMap.set(l.id, 0);
  for (const e of ledger ?? []) {
    availMap.set(e.quota_line_id, (availMap.get(e.quota_line_id) ?? 0) + Number(e.qty));
  }

  const enriched = items.map((it) => {
    const line = lineMap.get(it.product_id);
    const available = line ? (availMap.get(line.id) ?? 0) : 0;
    const requested = Number(it.qty);
    const prod = (it.products as any) as { name: string; code: string; uom: string } | null;

    return {
      product_id: it.product_id,
      product_name: prod?.name ?? "—",
      product_code: prod?.code ?? "—",
      uom: prod?.uom ?? "MT",
      requested,
      authorized: !!line,
      available,
      sufficient: !!line && available >= requested,
    };
  });

  return { items: enriched, sk };
}