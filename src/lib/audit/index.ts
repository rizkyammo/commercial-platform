import { createClient } from "@/lib/supabase/server";

interface AuditParams {
  action: string;
  module: string;
  resourceType?: string;
  resourceId?: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  result?: "SUCCESS" | "FAILED";
}

export async function writeAudit(params: AuditParams) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("audit_logs").insert({
      actor_user_id: user.id,
      action: params.action,
      module: params.module,
      resource_type: params.resourceType ?? null,
      resource_id: params.resourceId ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      reason: params.reason ?? null,
      result: params.result ?? "SUCCESS",
    });
  } catch (e) {
    console.error("audit write failed", e);
  }
}