import { listContracts } from "@/features/master/contracts/queries";
import { listCustomersSimple } from "@/features/master/customers/queries";
import { ContractsClient } from "./contracts-client";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 10;

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";
  const [{ data, count }, customers] = await Promise.all([
    listContracts({ q, page, pageSize: PAGE_SIZE }),
    listCustomersSimple(),
  ]);
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <div>
      <PageHeader title="Contracts" description="Manage contracts and business process rules." />
      <ContractsClient rows={data} customers={customers} total={count} page={page} totalPages={totalPages} q={q} />
    </div>
  );
}