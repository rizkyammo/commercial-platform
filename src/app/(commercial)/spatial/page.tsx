import {
  listSitesWithLocation,
  listProspects,
  listBases,
  listCoverageAreas,
  getSpatialSummary,
} from "@/features/spatial/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { SpatialClient } from "./spatial-client";

export default async function SpatialPage() {
  const [sites, prospects, bases, coverageAreas, summary] = await Promise.all([
    listSitesWithLocation(),
    listProspects(),
    listBases(),
    listCoverageAreas(),
    getSpatialSummary(),
  ]);

  const supabase = await createClient();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  return (
    <div>
      <PageHeader
        title="Spatial"
        description="Explore existing footprint and identify new opportunities."
      />
<SpatialClient
  sites={sites}
  prospects={prospects}
  bases={bases}
  coverageAreas={coverageAreas}
  summary={summary}
  permissions={permissions}
/>
    </div>
  );
}