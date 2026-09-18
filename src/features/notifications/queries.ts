import { createClient } from "@/lib/supabase/server";

export async function listMyNotifications(limit = 30) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { items: [], unread: 0 };

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  const unread = (data ?? []).filter((n) => !n.is_read).length;
  return { items: data ?? [], unread };
}