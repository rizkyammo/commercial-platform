"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validation/master";
import { writeAudit } from "@/lib/audit";

export async function createProduct(input: unknown) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase.from("products").insert({ ...parsed.data, created_by: user.id, updated_by: user.id }).select().single();
  if (error) return { error: error.message };

  await writeAudit({ action: "CREATE", module: "Product", resourceType: "product", resourceId: data.id, newValue: data });
  revalidatePath("/master-data/products");
  revalidatePath("/master-data");
  return { data };
}

export async function updateProduct(id: string, input: unknown) {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: old } = await supabase.from("products").select("*").eq("id", id).single();
  const { data, error } = await supabase.from("products").update({ ...parsed.data, updated_by: user.id }).eq("id", id).select().single();
  if (error) return { error: error.message };

  await writeAudit({ action: "UPDATE", module: "Product", resourceType: "product", resourceId: id, oldValue: old, newValue: data });
  revalidatePath("/master-data/products");
  return { data };
}

export async function deleteProduct(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: old } = await supabase.from("products").select("*").eq("id", id).single();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { error: error.message };
  await writeAudit({ action: "DELETE", module: "Product", resourceType: "product", resourceId: id, oldValue: old });
  revalidatePath("/master-data/products");
  return { ok: true };
}