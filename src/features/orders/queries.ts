import { createClient } from "@/lib/supabase/server";

export type OrderListParams = {
  q?: string;
  status?: string;
  customerId?: string;
  page: number;
  pageSize: number;
};

export async function listOrders({ q, status, customerId, page, pageSize }: OrderListParams) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Fetch orders (tanpa join) dulu
  let query = supabase
    .from("orders")
.select(
  "id, order_number, po_number, po_date, status, business_model, currency, selling_value, margin, current_stage, created_at, updated_at, customer_id, site_id, amendment_count, last_amendment_from_status"
)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.or(`order_number.ilike.%${q}%,po_number.ilike.%${q}%`);
  if (status && status !== "all") query = query.eq("status", status);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data: ordersRaw, count, error } = await query;
  if (error) throw error;

  const orders = ordersRaw ?? [];

  // Fetch related names secara terpisah (hindari join ambiguity)
  const customerIds = Array.from(new Set(orders.map((o) => o.customer_id).filter(Boolean)));
  const siteIds = Array.from(new Set(orders.map((o) => o.site_id).filter(Boolean)));

  const [{ data: customers }, { data: sites }] = await Promise.all([
    customerIds.length
      ? supabase.from("customers").select("id, name, code").in("id", customerIds)
      : Promise.resolve({ data: [] }),
    siteIds.length
      ? supabase.from("sites").select("id, name, code").in("id", siteIds)
      : Promise.resolve({ data: [] }),
  ]);

  const customerMap = new Map((customers ?? []).map((c) => [c.id, c]));
  const siteMap = new Map((sites ?? []).map((s) => [s.id, s]));

  const enriched = orders.map((o) => ({
    ...o,
    customers: customerMap.get(o.customer_id) ?? null,
    sites: siteMap.get(o.site_id) ?? null,
  }));

  return { data: enriched, count: count ?? 0 };
}

export async function getOrder(id: string) {
  const supabase = await createClient();

  // 1) Fetch order
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (orderErr) {
    console.error("[getOrder] order fetch error:", orderErr);
    throw new Error(`Failed to load order: ${orderErr.message}`);
  }
  if (!order) {
    console.warn("[getOrder] No order row for id:", id);
    return null;
  }

  // 2) Fetch related entities secara terpisah
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

export async function getOrderItems(orderId: string) {
  const supabase = await createClient();

  // Fetch items tanpa join
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

  // Enrich with products
  const productIds = Array.from(new Set(items.map((i) => i.product_id).filter(Boolean)));
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, code, name, uom").in("id", productIds)
    : { data: [] };

  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  return items.map((it) => ({
    ...it,
    products: productMap.get(it.product_id) ?? null,
  }));
}

export async function getOrderHistory(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getOrderApprovals(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("approval_requests")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

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

export async function getReferenceData() {
  const supabase = await createClient();
  const [{ data: customers }, { data: products }] = await Promise.all([
    supabase.from("customers").select("id, code, name").eq("is_active", true).order("name"),
    supabase.from("products").select("id, code, name, uom").eq("is_active", true).order("name"),
  ]);
  return { customers: customers ?? [], products: products ?? [] };
}

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