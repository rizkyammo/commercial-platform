import { createClient } from "@/lib/supabase/server";

// ---------------- SK ----------------
export async function listAuthorizations({ q, status, page = 1, pageSize = 20 }: {
  q?: string; status?: string; page?: number; pageSize?: number;
}) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("kemhan_authorizations")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (q) query = query.or(`sk_number.ilike.%${q}%,issuing_authority.ilike.%${q}%`);
  if (status && status !== "all") query = query.eq("status", status);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getActiveAuthorization() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kemhan_authorizations")
    .select("*")
    .eq("status", "ACTIVE")
    .order("effective_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getAuthorization(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kemhan_authorizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function getAuthorizationScopes(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kemhan_authorization_scopes")
    .select("*, products(id, code, name, uom)")
    .eq("authorization_id", id);
  return data ?? [];
}

export async function listAuthorizationHistory({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number }) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data } = await supabase
    .from("kemhan_authorizations")
    .select("*")
    .order("effective_date", { ascending: false, nullsFirst: false })
    .range(from, to);
  return data ?? [];
}

// ---------------- QUOTA ----------------
export async function getQuotaLinesByAuth(authId: string) {
  const supabase = await createClient();
  const { data: lines } = await supabase
    .from("kemhan_quota_lines")
    .select("*, products(id, code, name, uom)")
    .eq("authorization_id", authId)
    .order("created_at");

  if (!lines || lines.length === 0) return [];

  const lineIds = lines.map((l) => l.id);
  const { data: ledger } = await supabase
    .from("kemhan_quota_ledger")
    .select("quota_line_id, transaction_type, qty")
    .in("quota_line_id", lineIds);

  const byLine = new Map<string, { allocated: number; committed: number; realized: number; available: number }>();
  for (const l of lines) byLine.set(l.id, { allocated: 0, committed: 0, realized: 0, available: 0 });

  for (const e of ledger ?? []) {
    const agg = byLine.get(e.quota_line_id);
    if (!agg) continue;
    const q = Number(e.qty);
    agg.available += q;
    if (["ALLOCATION", "ADJUSTMENT", "REVERSAL"].includes(e.transaction_type)) agg.allocated += q;
    if (e.transaction_type === "PO_COMMITMENT") agg.committed += -q;
    if (e.transaction_type === "PO_RELEASE") agg.committed -= q;
    if (e.transaction_type === "DISTRIBUTION_REALIZATION") agg.realized += -q;
  }

  return lines.map((l) => {
    const agg = byLine.get(l.id)!;
    return {
      ...l,
      allocation_qty: Number(l.allocation_qty),
      realized_qty: Math.max(0, agg.realized),
      committed_qty: Math.max(0, agg.committed),
      available_qty: Math.max(0, agg.available),
      utilization_pct:
        Number(l.allocation_qty) > 0
          ? Math.min(100, ((agg.realized + agg.committed) / Number(l.allocation_qty)) * 100)
          : 0,
    };
  });
}

export async function getActiveQuotaByProduct() {
  const sk = await getActiveAuthorization();
  if (!sk) return [];
  return getQuotaLinesByAuth(sk.id);
}

export async function listQuotaLedger({ lineId, orderId, limit = 100 }: {
  lineId?: string; orderId?: string; limit?: number;
}) {
  const supabase = await createClient();
  let q = supabase
    .from("kemhan_quota_ledger")
    .select("*, kemhan_quota_lines(products(name, code, uom))")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (lineId) q = q.eq("quota_line_id", lineId);
  if (orderId) q = q.eq("order_id", orderId);

  const { data } = await q;
  return data ?? [];
}

// ---------------- ORDER INTEGRATION ----------------
export async function getOrderComplianceStatus(orderId: string, skId: string | null) {
  const supabase = await createClient();

  // Get order items
  const { data: items } = await supabase
    .from("order_items")
    .select("product_id, qty, products(name, code, uom)")
    .eq("order_id", orderId);

  if (!items || items.length === 0) return { items: [], sk: null };

  // Get SK
  let sk = null;
  if (skId) {
    sk = await getAuthorization(skId);
  } else {
    sk = await getActiveAuthorization();
  }

  if (!sk) return { items: [], sk: null };

  // Get quota lines
  const { data: lines } = await supabase
    .from("kemhan_quota_lines")
    .select("*")
    .eq("authorization_id", sk.id);
  const lineMap = new Map((lines ?? []).map((l) => [l.product_id, l]));

  // Get ledger for these lines
  const lineIds = (lines ?? []).map((l) => l.id);
  const { data: ledger } = lineIds.length
    ? await supabase
        .from("kemhan_quota_ledger")
        .select("quota_line_id, transaction_type, qty")
        .in("quota_line_id", lineIds)
    : { data: [] };

  const availMap = new Map<string, number>();
  for (const l of lines ?? []) availMap.set(l.id, 0);
  for (const e of ledger ?? []) {
    availMap.set(e.quota_line_id, (availMap.get(e.quota_line_id) ?? 0) + Number(e.qty));
  }

  const enriched = items.map((it) => {
    const line = lineMap.get(it.product_id);
    const available = line ? (availMap.get(line.id) ?? 0) : 0;
    const requested = Number(it.qty);
    return {
      product_id: it.product_id,
      product_name: (it.products as any)?.name ?? "—",
      product_code: (it.products as any)?.code ?? "—",
      uom: (it.products as any)?.uom ?? "MT",
      requested,
      authorized: !!line,
      available,
      sufficient: !!line && available >= requested,
    };
  });

  return { items: enriched, sk };
}

// ---------------- DASHBOARD ----------------
export async function getComplianceDashboard() {
  const supabase = await createClient();

  const sk = await getActiveAuthorization();

  const { count: activeCount } = await supabase
    .from("kemhan_authorizations")
    .select("*", { count: "exact", head: true })
    .eq("status", "ACTIVE");

  if (!sk) {
    return {
      activeSk: null,
      activeCount: activeCount ?? 0,
      lines: [],
      totalsByUom: [] as { uom: string; allocation: number; realized: number; committed: number; available: number }[],
      alerts: [],
      recentLedger: [],
    };
  }

  const lines = await getQuotaLinesByAuth(sk.id);

  // Group by UOM
  const uomMap = new Map<string, { uom: string; allocation: number; realized: number; committed: number; available: number }>();
  for (const l of lines) {
    const uom = l.uom || "—";
    const agg = uomMap.get(uom) ?? { uom, allocation: 0, realized: 0, committed: 0, available: 0 };
    agg.allocation += l.allocation_qty;
    agg.realized += l.realized_qty;
    agg.committed += l.committed_qty;
    agg.available += l.available_qty;
    uomMap.set(uom, agg);
  }
  const totalsByUom = Array.from(uomMap.values()).sort((a, b) => a.uom.localeCompare(b.uom));

  // Alerts
  const alerts: { type: string; severity: string; message: string }[] = [];
  if (sk.expiry_date) {
    const days = Math.ceil(
      (new Date(sk.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 30 && days >= 0)
      alerts.push({ type: "SK_EXPIRING", severity: "CRITICAL", message: `SK ${sk.sk_number} expires in ${days} days` });
    else if (days <= 60 && days > 30)
      alerts.push({ type: "SK_EXPIRING", severity: "WARNING", message: `SK ${sk.sk_number} expires in ${days} days` });
    else if (days <= 90 && days > 60)
      alerts.push({ type: "SK_EXPIRING", severity: "INFO", message: `SK ${sk.sk_number} expires in ${days} days` });
  }

  for (const l of lines) {
    const pct = l.utilization_pct;
    if (pct >= 100)
      alerts.push({ type: "QUOTA_EXHAUSTED", severity: "CRITICAL", message: `${l.products?.name ?? "Material"} quota exhausted` });
    else if (pct >= 90)
      alerts.push({ type: "QUOTA_WARNING", severity: "CRITICAL", message: `${l.products?.name ?? "Material"} at ${pct.toFixed(0)}% utilization` });
    else if (pct >= 80)
      alerts.push({ type: "QUOTA_WARNING", severity: "WARNING", message: `${l.products?.name ?? "Material"} at ${pct.toFixed(0)}% utilization` });
  }

  const lineIds = lines.map((l) => l.id);
  const { data: recentLedger } = lineIds.length
    ? await supabase
        .from("kemhan_quota_ledger")
        .select("*, kemhan_quota_lines(products(name, code, uom))")
        .in("quota_line_id", lineIds)
        .order("created_at", { ascending: false })
        .limit(15)
    : { data: [] };

  return {
    activeSk: sk,
    activeCount: activeCount ?? 0,
    lines,
    totalsByUom,
    alerts,
    recentLedger: recentLedger ?? [],
  };
}