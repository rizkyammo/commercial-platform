"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { vendorSchema } from "@/lib/validation/master";
import { writeAudit } from "@/lib/audit";

export async function createVendor(input: unknown) {
  const parsed = vendorSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data, error } = await supabase.from("vendors").insert({ ...parsed.data, created_by: user.id, updated_by: user.id }).select().single();
  if (error) return { error: error.message };
  await writeAudit({ action: "CREATE", module: "Vendor", resourceType: "vendor", resourceId: data.id, newValue: data });
  revalidatePath("/master-data/vendors"); revalidatePath("/master-data");
  return { data };
}
export async function updateVendor(id: string, input: unknown) {
  const parsed = vendorSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: old } = await supabase.from("vendors").select("*").eq("id", id).single();
  const { data, error } = await supabase.from("vendors").update({ ...parsed.data, updated_by: user.id }).eq("id", id).select().single();
  if (error) return { error: error.message };
  await writeAudit({ action: "UPDATE", module: "Vendor", resourceType: "vendor", resourceId: id, oldValue: old, newValue: data });
  revalidatePath("/master-data/vendors");
  return { data };
}
export async function deleteVendor(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: old } = await supabase.from("vendors").select("*").eq("id", id).single();
  const { error } = await supabase.from("vendors").delete().eq("id", id);
  if (error) return { error: error.message };
  await writeAudit({ action: "DELETE", module: "Vendor", resourceType: "vendor", resourceId: id, oldValue: old });
  revalidatePath("/master-data/vendors");
  return { ok: true };
}