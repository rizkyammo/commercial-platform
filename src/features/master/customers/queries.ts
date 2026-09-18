import { createClient } from "@/lib/supabase/server";

export type ListParams = {
  q?: string;
  status?: string;
  page: number;
  pageSize: number;
};

export async function listCustomers({ q, status, page, pageSize }: ListParams) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%,email.ilike.%${q}%`);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function getCustomer(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("*").eq("id", id).single();
  return data;
}

export async function getCustomerRelated(id: string) {
  const supabase = await createClient();
  const [{ data: sites }, { data: contracts }] = await Promise.all([
    supabase.from("sites").select("id, code, name, business_model, is_active").eq("customer_id", id),
    supabase.from("contracts").select("id, code, name, status, start_date, end_date, currency, value").eq("customer_id", id),
  ]);
  return { sites: sites ?? [], contracts: contracts ?? [] };
}

export async function listCustomersSimple() {
  const supabase = await createClient();
  const { data } = await supabase.from("customers").select("id, code, name").eq("is_active", true).order("name");
  return data ?? [];
}