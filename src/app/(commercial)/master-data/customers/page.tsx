import { listCustomers, listCustomersSimple } from "@/features/master/customers/queries";
import { CustomersClient } from "./customers-client";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 10;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";
  const status = params.status ?? "";

  const { data, count } = await listCustomers({ q, status, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage customer master data."
      />
      <CustomersClient
        rows={data}
        total={count}
        page={page}
        totalPages={totalPages}
        q={q}
        status={status}
      />
    </div>
  );
}