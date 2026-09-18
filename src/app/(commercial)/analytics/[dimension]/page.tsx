import { notFound } from "next/navigation";
import {
  getAnalyticsDimension,
  type TimeRange,
  type DimensionType,
} from "@/features/analytics/queries";
import { PageHeader } from "@/components/ui/page-header";
import { AnalyticsDetailClient } from "./analytics-detail-client";

const VALID_DIMENSIONS: DimensionType[] = [
  "margin-by-site",
  "margin-by-customer",
  "margin-by-product",
  "orders-by-customer",
];

export default async function AnalyticsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ dimension: string }>;
  searchParams: Promise<{ preset?: string; from?: string; to?: string }>;
}) {
  const { dimension } = await params;
  const sp = await searchParams;

  if (!VALID_DIMENSIONS.includes(dimension as DimensionType)) {
    notFound();
  }

  const range: TimeRange = {
    preset: (sp.preset as TimeRange["preset"]) ?? "monthly",
    from: sp.from,
    to: sp.to,
  };

  const result = await getAnalyticsDimension(
    dimension as DimensionType,
    range
  );

  return (
    <div>
      <PageHeader title={result.title} description={result.description} />
      <AnalyticsDetailClient
        dimension={dimension}
        range={range}
        columns={result.columns}
        rows={result.rows}
      />
    </div>
  );
}