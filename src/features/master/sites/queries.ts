import { createClient } from "@/lib/supabase/server";

export async function listSites({
  q, customerId, page, pageSize,
}: { q?: string; customerId?: string; page: number; pageSize: number }) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("sites")
    .select("id, code, name, customer_id, latitude, longitude, province, city, business_model, site_status, is_active, updated_at, customers(name)", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%`);
  if (customerId) query = query.eq("customer_id", customerId);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getSite(id: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sites")
    .select("*, customers(id, code, name)")
    .eq("id", id)
    .single();
  return data;
}