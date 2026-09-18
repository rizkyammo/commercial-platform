import { getFlowCounters, listFlowOrders } from "@/features/flow/queries";
import { PageHeader } from "@/components/ui/page-header";
import { FlowClient } from "./flow-client";

const PAGE_SIZE = 20;

export default async function FlowPage({
  searchParams,
}: {
  searchParams: Promise<{
    stage?: string;
    view?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const stage = params.stage ?? "all";
  const view = params.view ?? "all";
  const q = params.q ?? "";

  const [{ data, count }, counters] = await Promise.all([
    listFlowOrders({ stage, view, q, page, pageSize: PAGE_SIZE }),
    getFlowCounters(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Flow"
        description="Track order execution from PO to BAST — semua order, semua status."
      />
      <FlowClient
        rows={data}
        total={count}
        page={page}
        totalPages={totalPages}
        q={q}
        stage={stage}
        view={view}
        counters={counters}
      />
    </div>
  );
}