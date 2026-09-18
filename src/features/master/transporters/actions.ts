"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transporterSchema } from "@/lib/validation/master";
import { writeAudit } from "@/lib/audit";

export async function createTransporter(input: unknown) {
  const parsed = transporterSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data, error } = await supabase.from("transporters").insert({ ...parsed.data, created_by: user.id, updated_by: user.id }).select().single();
  if (error) return { error: error.message };
  await writeAudit({ action: "CREATE", module: "Transporter", resourceType: "transporter", resourceId: data.id, newValue: data });
  revalidatePath("/master-data/transporters"); revalidatePath("/master-data");
  return { data };
}
export async function updateTransporter(id: string, input: unknown) {
  const parsed = transporterSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: old } = await supabase.from("transporters").select("*").eq("id", id).single();
  const { data, error } = await supabase.from("transporters").update({ ...parsed.data, updated_by: user.id }).eq("id", id).select().single();
  if (error) return { error: error.message };
  await writeAudit({ action: "UPDATE", module: "Transporter", resourceType: "transporter", resourceId: id, oldValue: old, newValue: data });
  revalidatePath("/master-data/transporters");
  return { data };
}
export async function deleteTransporter(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: old } = await supabase.from("transporters").select("*").eq("id", id).single();
  const { error } = await supabase.from("transporters").delete().eq("id", id);
  if (error) return { error: error.message };
  await writeAudit({ action: "DELETE", module: "Transporter", resourceType: "transporter", resourceId: id, oldValue: old });
  revalidatePath("/master-data/transporters");
  return { ok: true };
}