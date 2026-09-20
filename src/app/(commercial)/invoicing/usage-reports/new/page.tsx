import { createClient } from "@/lib/supabase/server";
import { listCustomersSimple } from "@/features/master/customers/queries";
import { PageHeader } from "@/components/ui/page-header";
import { UsageReportForm } from "./usage-report-form";

export default async function NewUsageReportPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  const supabase = await createClient();

  const [{ data: products }, { data: sites }, customers] = await Promise.all([
    supabase
      .from("products")
      .select("id, code, name, uom")
      .order("name"),
    supabase.from("sites").select("id, code, name").order("name"),
    listCustomersSimple(),
  ]);

  // Ambil order kalau ada prefill
  let order: any = null;
  if (orderId) {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, customer_id, currency, project_code, order_type, business_model")
      .eq("id", orderId)
      .maybeSingle();
    order = data;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perms } = await supabase.rpc("current_user_permissions");

  return (
    <div>
      <PageHeader
        title="New Usage Report"
        description="Catat pemakaian barang (consignment) atau volume produksi (BCM) untuk satu periode."
      />
      <UsageReportForm
        products={products ?? []}
        sites={sites ?? []}
        customers={customers}
        order={order}
        permissions={(perms ?? []) as string[]}
      />
    </div>
  );
}