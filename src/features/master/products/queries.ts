import { createClient } from "@/lib/supabase/server";

export async function listProducts({ q, page, pageSize }: { q?: string; page: number; pageSize: number }) {
  const supabase = await createClient();
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (q) query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%,category.ilike.%${q}%`);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data ?? [], count: count ?? 0 };
}

export async function listProductsSimple() {
  const supabase = await createClient();
  const { data } = await supabase.from("products").select("id, code, name, uom").eq("is_active", true).order("name");
  return data ?? [];
}