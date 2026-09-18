import { listTransporters } from "@/features/master/transporters/queries";
import { TransportersClient } from "./transporters-client";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 10;

export default async function TransportersPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";
  const { data, count } = await listTransporters({ q, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <div>
      <PageHeader title="Transporters" description="Manage transporter master data." />
      <TransportersClient rows={data} total={count} page={page} totalPages={totalPages} q={q} />
    </div>
  );
}