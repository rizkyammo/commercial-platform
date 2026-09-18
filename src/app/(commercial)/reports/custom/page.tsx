import { getAnalyticsFilterOptions } from "@/features/analytics/queries";
import { PageHeader } from "@/components/ui/page-header";
import { CustomBuilderClient } from "./custom-builder-client";

export default async function CustomReportPage() {
  const filters = await getAnalyticsFilterOptions();

  return (
    <div>
      <PageHeader
        title="Custom Report Builder"
        description="Build your own report with filters and selected fields."
      />
      <CustomBuilderClient filters={filters} />
    </div>
  );
}