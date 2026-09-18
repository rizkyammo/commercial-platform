import { getComplianceDashboard } from "@/features/compliance/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ComplianceClient } from "./compliance-client";

export default async function CompliancePage() {
  const [dashboard] = await Promise.all([getComplianceDashboard()]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  return (
    <div>
      <PageHeader
        title="Compliance"
        description="Manage Kemhan authorizations and material quotas."
      />
      <ComplianceClient dashboard={dashboard} permissions={permissions} />
    </div>
  );
}