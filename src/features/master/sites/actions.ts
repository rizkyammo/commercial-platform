"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { siteSchema } from "@/lib/validation/master";
import { writeAudit } from "@/lib/audit";

export async function createSite(input: unknown) {
  const parsed = siteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("sites")
    .insert({ ...parsed.data, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({ action: "CREATE", module: "Site", resourceType: "site", resourceId: data.id, newValue: data });
  revalidatePath("/master-data/sites");
  revalidatePath("/master-data");
  return { data };
}

export async function updateSite(id: string, input: unknown) {
  const parsed = siteSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: old } = await supabase.from("sites").select("*").eq("id", id).single();

  const { data, error } = await supabase
    .from("sites")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({
    action: "UPDATE", module: "Site", resourceType: "site", resourceId: id,
    oldValue: old, newValue: data,
  });
  revalidatePath("/master-data/sites");
  revalidatePath(`/master-data/sites/${id}`);
  return { data };
}

export async function deleteSite(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: old } = await supabase.from("sites").select("*").eq("id", id).single();
  const { error } = await supabase.from("sites").delete().eq("id", id);
  if (error) return { error: error.message };

  await writeAudit({ action: "DELETE", module: "Site", resourceType: "site", resourceId: id, oldValue: old });
  revalidatePath("/master-data/sites");
  return { ok: true };
}