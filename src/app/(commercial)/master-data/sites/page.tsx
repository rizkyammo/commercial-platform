import { listSites } from "@/features/master/sites/queries";
import { listCustomersSimple } from "@/features/master/customers/queries";
import { SitesClient } from "./sites-client";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 10;

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; customer?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";
  const customerId = params.customer ?? "";

  const [{ data, count }, customers] = await Promise.all([
    listSites({ q, customerId, page, pageSize: PAGE_SIZE }),
    listCustomersSimple(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader title="Sites" description="Manage customer sites and locations." />
      <SitesClient
        rows={data}
        customers={customers}
        total={count}
        page={page}
        totalPages={totalPages}
        q={q}
        customerId={customerId}
      />
    </div>
  );
}