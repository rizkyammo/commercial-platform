import { listOrders, getOrderCounters } from "@/features/orders/queries";
import { listCustomersSimple } from "@/features/master/customers/queries";
import { OrdersClient } from "./orders-client";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 10;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; customer?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const customerId = params.customer ?? "";

  const [{ data, count }, counters, customers] = await Promise.all([
    listOrders({ q, status, customerId, page, pageSize: PAGE_SIZE }),
    getOrderCounters(),
    listCustomersSimple(),
  ]);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Manage customer orders from draft to completion."
      />
      <OrdersClient
        rows={data}
        total={count}
        page={page}
        totalPages={totalPages}
        q={q}
        status={status}
        customerId={customerId}
        counters={counters}
        customers={customers}
      />
    </div>
  );
}