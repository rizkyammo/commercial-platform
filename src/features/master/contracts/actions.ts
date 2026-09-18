"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { contractSchema } from "@/lib/validation/master";
import { writeAudit } from "@/lib/audit";

function splitContract(input: unknown) {
  const parsed = contractSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const {
    fulfillment_model, billing_model, pricing_model, payment_model, logistics_model,
    requires_bast, requires_compliance, requires_consumption_report, requires_customer_approval,
    invoice_trigger, revenue_recognition_trigger, payment_term_days,
    ...contract
  } = parsed.data;
  const rules = {
    fulfillment_model, billing_model, pricing_model, payment_model, logistics_model,
    requires_bast, requires_compliance, requires_consumption_report, requires_customer_approval,
    invoice_trigger, revenue_recognition_trigger, payment_term_days,
  };
  return { contract, rules };
}

export async function createContract(input: unknown) {
  const split = splitContract(input);
  if ("error" in split) return { error: split.error };
  const { contract, rules } = split;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const payload = {
    ...contract,
    site_id: contract.site_id === "" ? null : contract.site_id,
    start_date: contract.start_date === "" ? null : contract.start_date,
    end_date: contract.end_date === "" ? null : contract.end_date,
    created_by: user.id,
    updated_by: user.id,
  };

  const { data, error } = await supabase.from("contracts").insert(payload).select().single();
  if (error) return { error: error.message };

  await supabase.from("contract_rules").insert({ contract_id: data.id, ...rules });

  await writeAudit({ action: "CREATE", module: "Contract", resourceType: "contract", resourceId: data.id, newValue: { contract: data, rules } });
  revalidatePath("/master-data/contracts");
  revalidatePath("/master-data");
  return { data };
}

export async function updateContract(id: string, input: unknown) {
  const split = splitContract(input);
  if ("error" in split) return { error: split.error };
  const { contract, rules } = split;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { data: old } = await supabase.from("contracts").select("*").eq("id", id).single();

  const payload = {
    ...contract,
    site_id: contract.site_id === "" ? null : contract.site_id,
    start_date: contract.start_date === "" ? null : contract.start_date,
    end_date: contract.end_date === "" ? null : contract.end_date,
    updated_by: user.id,
  };

  const { data, error } = await supabase.from("contracts").update(payload).eq("id", id).select().single();
  if (error) return { error: error.message };

  await supabase.from("contract_rules").upsert({ contract_id: id, ...rules }, { onConflict: "contract_id" });

  await writeAudit({ action: "UPDATE", module: "Contract", resourceType: "contract", resourceId: id, oldValue: old, newValue: data });
  revalidatePath("/master-data/contracts");
  return { data };
}

export async function deleteContract(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const { data: old } = await supabase.from("contracts").select("*").eq("id", id).single();
  const { error } = await supabase.from("contracts").delete().eq("id", id);
  if (error) return { error: error.message };
  await writeAudit({ action: "DELETE", module: "Contract", resourceType: "contract", resourceId: id, oldValue: old });
  revalidatePath("/master-data/contracts");
  return { ok: true };
}