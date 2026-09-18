import { listOrgUnits, getOrgStats } from "@/features/admin/organisation/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { OrganisationClient } from "./organisation-client";

export default async function OrganisationPage() {
  const [units, stats] = await Promise.all([listOrgUnits(), getOrgStats()]);

  const supabase = await createClient();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  return (
    <div>
      <PageHeader
        title="Organisation"
        description="Manage your organisational structure, business units, and departments."
      />
      <OrganisationClient
        units={units}
        stats={stats}
        permissions={permissions}
      />
    </div>
  );
}