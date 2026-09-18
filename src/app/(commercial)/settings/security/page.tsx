import { createClient } from "@/lib/supabase/server";
import { SecurityForm } from "./security-form";

export default async function SecuritySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: recentActivity } = await supabase
    .from("audit_logs")
    .select("action, module, created_at, result")
    .eq("actor_user_id", user.id)
    .in("module", ["Authentication", "User"])
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <SecurityForm
      email={profile?.email ?? ""}
      lastLogin={profile?.updated_at ?? null}
      recentActivity={recentActivity ?? []}
    />
  );
}