import { listMigrationBatches } from "@/features/migration/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { MigrationClient } from "./migration-client";

export default async function MigrationPage() {
  const batches = await listMigrationBatches();

  const supabase = await createClient();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  return (
    <div>
      <PageHeader
        title="Data Migration"
        description="Import legacy data dari Excel atau CSV dengan mapping, validasi, dan dry-run."
      />
      <MigrationClient batches={batches} permissions={permissions} />
    </div>
  );
}