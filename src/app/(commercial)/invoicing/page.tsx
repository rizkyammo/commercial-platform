import {
  getInvoicingDashboard,
  listInvoices,
  getUninvoicedOrders,
} from "@/features/invoicing/queries";
import { listCustomersSimple } from "@/features/master/customers/queries";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";
import { InvoicingClient } from "./invoicing-client";

const PAGE_SIZE = 20;

export default async function InvoicingPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    customer?: string;
    page?: string;
  }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";
  const status = params.status ?? "all";
  const customerId = params.customer ?? "";

  const [{ data, count }, dashboard, uninvoicedOrders, customers] =
    await Promise.all([
      listInvoices({ q, status, customerId, page, pageSize: PAGE_SIZE }),
      getInvoicingDashboard(),
      getUninvoicedOrders(),
      listCustomersSimple(),
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
        title="Invoicing"
        description="Outstanding monitoring, uninvoiced orders, and aging analysis."
      />
      <InvoicingClient
        rows={data}
        total={count}
        page={page}
        totalPages={totalPages}
        q={q}
        status={status}
        customerId={customerId}
        customers={customers}
        dashboard={dashboard}
        uninvoicedOrders={uninvoicedOrders}
        permissions={permissions}
      />
    </div>
  );
}