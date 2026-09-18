import { listProspects } from "@/features/spatial/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { ProspectsClient } from "./prospects-client";

export default async function ProspectsPage() {
  const prospects = await listProspects();

  const supabase = await createClient();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  return (
    <div>
      <PageHeader
        title="Prospects"
        description="Manage prospect list and pipeline."
      />
      <ProspectsClient prospects={prospects} permissions={permissions} />
    </div>
  );
}