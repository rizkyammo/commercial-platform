import { createAdminClient } from "@/lib/supabase/admin";

export async function logServerError(
  error: unknown,
  context?: {
    userId?: string;
    action?: string;
    module?: string;
    requestId?: string;
  }
) {
  try {
    const message =
      error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    console.error("[ServerError]", {
      message,
      stack,
      ...context,
    });

    // Optional: persist to Supabase untuk analysis
    const admin = createAdminClient();
    await admin.from("security_events").insert({
      event_type: "SERVER_ERROR",
      severity: "CRITICAL",
      actor_user_id: context?.userId ?? null,
      details: {
        message,
        stack: stack?.slice(0, 2000),
        action: context?.action,
        module: context?.module,
        request_id: context?.requestId,
      },
    });
  } catch (e) {
    console.error("[logServerError] failed to log:", e);
  }
}