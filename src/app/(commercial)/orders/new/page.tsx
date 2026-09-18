import { getReferenceData } from "@/features/orders/queries";
import { NewOrderForm } from "./new-order-form";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewOrderPage() {
  const { customers, products } = await getReferenceData();

  return (
    <div>
      <PageHeader
        title="New Order"
        description="Buat draft order baru. Anda dapat menyimpan sebagai draft dan melengkapinya nanti."
      />
      <NewOrderForm customers={customers} products={products} />
    </div>
  );
}