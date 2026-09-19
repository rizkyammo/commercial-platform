"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { customerSchema } from "@/lib/validation/master";
import { writeAudit } from "@/lib/audit";

export async function createCustomer(input: unknown) {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data, error } = await supabase
    .from("customers")
    .insert({ ...parsed.data, created_by: user.id, updated_by: user.id })
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({
    action: "CREATE",
    module: "Customer",
    resourceType: "customer",
    resourceId: data.id,
    newValue: data,
  });

  revalidatePath("/master-data/customers");
  revalidatePath("/master-data");
  
  return { data };
}
export async function updateCustomer(id: string, input: unknown) {
  const parsed = customerSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: old } = await supabase.from("customers").select("*").eq("id", id).single();

  const { data, error } = await supabase
    .from("customers")
    .update({ ...parsed.data, updated_by: user.id })
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };

  await writeAudit({
    action: "UPDATE",
    module: "Customer",
    resourceType: "customer",
    resourceId: id,
    oldValue: old,
    newValue: data,
  });

  revalidatePath("/master-data/customers");
  revalidatePath(`/master-data/customers/${id}`);
  return { data };
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: old } = await supabase.from("customers").select("*").eq("id", id).single();
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) return { error: error.message };

  await writeAudit({
    action: "DELETE",
    module: "Customer",
    resourceType: "customer",
    resourceId: id,
    oldValue: old,
  });

  revalidatePath("/master-data/customers");
  return { ok: true };
}