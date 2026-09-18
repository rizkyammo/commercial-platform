import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    // 1) Ambil user saat ini pakai auth client (untuk actor_user_id)
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    // 2) Insert via service role (bypass RLS) — audit tidak boleh diblokir user biasa
    const admin = createAdminClient();

    const { error } = await admin.from("audit_logs").insert({
      actor_user_id: user?.id ?? null,
      action: params.action,
      module: params.module,
      resource_type: params.resourceType ?? null,
      resource_id: params.resourceId ?? null,
      old_value: params.oldValue ?? null,
      new_value: params.newValue ?? null,
      reason: params.reason ?? null,
      result: params.result ?? "SUCCESS",
    });

    if (error) {
      // Log ke console server agar terlihat di terminal CMD / Vercel logs
      console.error("[writeAudit] insert failed:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        payload: params,
      });
    }
  } catch (e) {
    console.error("[writeAudit] unexpected error:", e);
  }
}