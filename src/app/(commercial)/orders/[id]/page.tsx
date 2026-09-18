import { notFound } from "next/navigation";
import {
  getOrder,
  getOrderItems,
  getOrderHistory,
  getOrderApprovals,
  getSitesByCustomer,
  getContractsByCustomer,
  getReferenceData,
} from "@/features/orders/queries";
import { createClient } from "@/lib/supabase/server";
import { OrderDetail } from "./order-detail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();

  const [items, history, approvals, sites, contracts, refData] = await Promise.all([
    getOrderItems(id),
    getOrderHistory(id),
    getOrderApprovals(id),
    getSitesByCustomer(order.customer_id),
    getContractsByCustomer(order.customer_id),
    getReferenceData(),
  ]);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  return (
    <OrderDetail
      order={order}
      items={items}
      history={history}
      approvals={approvals}
      sites={sites}
      contracts={contracts}
      products={refData.products}
      currentUserId={user?.id ?? ""}
      permissions={permissions}
    />
  );
}