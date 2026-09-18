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
import {
  listProcurements,
  listShipments,
  listDeliveries,
  listBasts,
  listVendorsSimple,
  listTransportersSimple,
} from "@/features/flow/queries";
import { getProcurementCoverage } from "@/features/flow/actions";
import { getOrderComplianceStatus } from "@/features/compliance/queries";
import { createClient } from "@/lib/supabase/server";
import { OrderDetail } from "./order-detail";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let order;
  try {
    order = await getOrder(id);
  } catch (e) {
    console.error("[OrderDetailPage] getOrder failed:", e);
    notFound();
  }
  if (!order) notFound();

  const [
    items,
    history,
    approvals,
    sites,
    contracts,
    refData,
    procurements,
    shipments,
    deliveries,
    basts,
    vendors,
    transporters,
    compliance,
    coverage,
  ] = await Promise.all([
    getOrderItems(id),
    getOrderHistory(id),
    getOrderApprovals(id),
    getSitesByCustomer(order.customer_id),
    getContractsByCustomer(order.customer_id),
    getReferenceData(),
    listProcurements(id),
    listShipments(id),
    listDeliveries(id),
    listBasts(id),
    listVendorsSimple(),
    listTransportersSimple(),
    getOrderComplianceStatus(id, (order as { sk_id?: string | null }).sk_id ?? null),
    getProcurementCoverage(id),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  const orderItemsRef = items.map((it) => ({
    product_id: it.product_id,
    qty: Number(it.qty),
    uom: it.uom,
  }));

  return (
    <OrderDetail
      order={order}
      items={items}
      history={history}
      approvals={approvals}
      sites={sites}
      contracts={contracts}
      products={refData.products}
      procurements={procurements}
      shipments={shipments}
      deliveries={deliveries}
      basts={basts}
      vendors={vendors}
      transporters={transporters}
      orderItemsRef={orderItemsRef}
      compliance={compliance as any}
      coverage={coverage}
      currentUserId={user?.id ?? ""}
      permissions={permissions}
    />
  );
}