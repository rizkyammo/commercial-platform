import { createClient } from "@/lib/supabase/server";

// ---------- PROCUREMENT ----------
export async function listProcurements(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("procurements")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  // Enrich vendors
  const vendorIds = Array.from(new Set(data.map((p) => p.vendor_id).filter(Boolean)));
  const { data: vendors } = vendorIds.length
    ? await supabase.from("vendors").select("id, code, name").in("id", vendorIds)
    : { data: [] };
  const vendorMap = new Map((vendors ?? []).map((v) => [v.id, v]));

  return data.map((p) => ({
    ...p,
    vendors: p.vendor_id ? vendorMap.get(p.vendor_id) ?? null : null,
  }));
}

export async function getProcurement(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("procurements").select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  const { data: items } = await supabase
    .from("procurement_items")
    .select("*")
    .eq("procurement_id", id)
    .order("sort_order");

  const productIds = Array.from(new Set((items ?? []).map((i) => i.product_id).filter(Boolean)));
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, code, name, uom").in("id", productIds)
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

// ---------- SHIPMENT ----------
export async function listShipments(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shipments")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const transporterIds = Array.from(new Set(data.map((s) => s.transporter_id).filter(Boolean)));
  const { data: transporters } = transporterIds.length
    ? await supabase.from("transporters").select("id, code, name").in("id", transporterIds)
    : { data: [] };
  const tMap = new Map((transporters ?? []).map((t) => [t.id, t]));

  return data.map((s) => ({
    ...s,
    transporters: s.transporter_id ? tMap.get(s.transporter_id) ?? null : null,
  }));
}

export async function getShipment(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("shipments").select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  const { data: items } = await supabase
    .from("shipment_items")
    .select("*")
    .eq("shipment_id", id)
    .order("sort_order");

  const productIds = Array.from(new Set((items ?? []).map((i) => i.product_id).filter(Boolean)));
  const { data: products } = productIds.length
    ? await supabase.from("products").select("id, code, name, uom").in("id", productIds)
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

// ---------- DELIVERY ----------
export async function listDeliveries(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deliveries")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ---------- BAST ----------
export async function listBasts(orderId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("basts")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ---------- SHIPPED QTY (per product) ----------
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

// ---------- REFERENCE DATA ----------
export async function listVendorsSimple() {
  const supabase = await createClient();
  const { data } = await supabase.from("vendors").select("id, code, name").eq("is_active", true).order("name");
  return data ?? [];
}

export async function listTransportersSimple() {
  const supabase = await createClient();
  const { data } = await supabase.from("transporters").select("id, code, name, plate_number").eq("is_active", true).order("name");
  return data ?? [];
}