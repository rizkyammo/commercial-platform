import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { from, to, customer_id, site_id, contract_id, status, fields } = body as {
    from?: string;
    to?: string;
    customer_id?: string;
    site_id?: string;
    contract_id?: string;
    status?: string;
    fields: string[];
  };

  let q = supabase
    .from("orders")
    .select(
      "order_number, po_number, po_date, status, business_model, current_stage, currency, selling_value, total_direct_cost, margin, created_at, customers(name), sites(name), contracts(name)"
    )
    .order("created_at", { ascending: false })
    .limit(1000);

  if (from) q = q.gte("created_at", from);
  if (to) q = q.lte("created_at", to + "T23:59:59");
  if (customer_id) q = q.eq("customer_id", customer_id);
  if (site_id) q = q.eq("site_id", site_id);
  if (contract_id) q = q.eq("contract_id", contract_id);
  if (status && status !== "all") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((o) => {
    const selling = Number(o.selling_value ?? 0);
    const margin = Number(o.margin ?? 0);
    const flat: Record<string, unknown> = {
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
      selling_value: selling,
      total_direct_cost: Number(o.total_direct_cost ?? 0),
      margin: margin,
      margin_pct: selling > 0 ? (margin / selling) * 100 : 0,
      created_at: o.created_at,
    };

    // Filter fields
    const picked: Record<string, unknown> = {};
    for (const f of fields) {
      picked[f] = flat[f];
    }
    return picked;
  });

  return NextResponse.json({ rows });
}