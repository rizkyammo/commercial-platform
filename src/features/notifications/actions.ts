"use server";

import { createClient } from "@/lib/supabase/server";

type CreateNotificationParams = {
  userId: string;
  type: string;
  severity?: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  title: string;
  message?: string;
  link?: string;
  metadata?: Record<string, unknown>;
};

export async function createNotification(params: CreateNotificationParams) {
  const supabase = await createClient();
  await supabase.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    severity: params.severity ?? "INFO",
    title: params.title,
    message: params.message ?? null,
    link: params.link ?? null,
    metadata: params.metadata ?? {},
  });
}

export async function notifyUsersWithRole(
  roleName: string,
  params: Omit<CreateNotificationParams, "userId">
) {
  const supabase = await createClient();
  const { data: users } = await supabase.rpc("users_with_role", { p_role: roleName });
  if (!users) return;
  for (const u of users as { user_id: string }[]) {
    await createNotification({ ...params, userId: u.user_id });
  }
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("is_read", false);
}