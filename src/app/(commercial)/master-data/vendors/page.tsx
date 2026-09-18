import { listVendors } from "@/features/master/vendors/queries";
import { VendorsClient } from "./vendors-client";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 10;

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";
  const { data, count } = await listVendors({ q, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <div>
      <PageHeader title="Vendors" description="Manage suppliers and vendor master data." />
      <VendorsClient rows={data} total={count} page={page} totalPages={totalPages} q={q} />
    </div>
  );
}