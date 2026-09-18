import { notFound, redirect } from "next/navigation";
import { getInvoice } from "@/features/invoicing/queries";
import { createClient } from "@/lib/supabase/server";
import { InvoiceEditForm } from "./invoice-edit-form";

export default async function InvoiceEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await getInvoice(id);
  if (!invoice) notFound();

  // Guard: hanya bisa edit kalau belum ada payment
  const hasPayment = Number(invoice.paid_amount) > 0;
  if (
    invoice.status === "PAID" ||
    invoice.status === "CANCELLED" ||
    hasPayment
  ) {
    redirect(`/invoicing/${id}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  // Fetch order items untuk prefill options
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_id, qty, uom, unit_price, products(name)")
    .eq("order_id", (invoice as any).order_id);

  const orderItemsRef =
    (orderItems ?? []).map((it) => ({
      product_id: it.product_id,
      product_name:
        (it.products as { name?: string } | null)?.name ?? "—",
      uom: it.uom,
      qty: Number(it.qty),
      unit_price: Number(it.unit_price),
    }));

  return (
    <InvoiceEditForm
      invoice={invoice as any}
      orderItems={orderItemsRef}
      permissions={permissions}
    />
  );
}