import { getAnalyticsDashboard, type TimeRange } from "@/features/analytics/queries";
import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range: TimeRange = {
    preset: (params.preset as TimeRange["preset"]) ?? "monthly",
    from: params.from,
    to: params.to,
  };

  const dashboard = await getAnalyticsDashboard(range);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Commercial performance at a glance."
      />
      <AnalyticsClient range={range} dashboard={dashboard} />
    </div>
  );
}