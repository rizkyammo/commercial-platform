import {
  listUsageReports,
  listPendingUsageReports,
} from "@/features/invoicing/usage-queries";
import { listCustomersSimple } from "@/features/master/customers/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { UsageReportsClient } from "./usage-reports-client";

const PAGE_SIZE = 20;

export default async function UsageReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    report_type?: string;
    project_code?: string;
    customer?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const reportType = params.report_type ?? "";
  const projectCode = params.project_code ?? "";
  const customerId = params.customer ?? "";

  const [{ data, count }, customers, pending] = await Promise.all([
    listUsageReports({
      q,
      status,
      reportType,
      projectCode,
      customerId,
      page,
      pageSize: PAGE_SIZE,
    }),
    listCustomersSimple(),
    listPendingUsageReports(5),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Usage Reports"
        description="Consignment usage & BCM production volume — dasar penerbitan invoice periode."
      />
      <UsageReportsClient
        rows={data}
        total={count}
        page={page}
        totalPages={totalPages}
        q={q}
        status={status}
        reportType={reportType}
        projectCode={projectCode}
        customerId={customerId}
        customers={customers}
        pending={pending}
        permissions={permissions}
      />
    </div>
  );
}