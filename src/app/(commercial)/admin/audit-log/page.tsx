import {
  listAuditLogs,
  getAuditFilterOptions,
  getAuditStats,
} from "@/features/admin/audit/queries";
import { PageHeader } from "@/components/ui/page-header";
import { AuditLogClient } from "./audit-log-client";

const PAGE_SIZE = 20;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    module?: string;
    action?: string;
    result?: string;
    actor?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));

  const [{ data, count }, filters, stats] = await Promise.all([
    listAuditLogs({
      q: params.q ?? "",
      module: params.module ?? "all",
      action: params.action ?? "all",
      result: params.result ?? "all",
      actor: params.actor ?? "",
      from: params.from,
      to: params.to,
      page,
      pageSize: PAGE_SIZE,
    }),
    getAuditFilterOptions(),
    getAuditStats(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Track and review all important activities across the AmmoBiz platform."
      />
      <AuditLogClient
        rows={data}
        total={count}
        page={page}
        totalPages={totalPages}
        filters={filters}
        stats={stats}
        query={{
          q: params.q ?? "",
          module: params.module ?? "all",
          action: params.action ?? "all",
          result: params.result ?? "all",
          actor: params.actor ?? "",
          from: params.from,
          to: params.to,
        }}
      />
    </div>
  );
}