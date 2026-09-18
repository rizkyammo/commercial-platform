import { notFound } from "next/navigation";
import { getInvoice } from "@/features/invoicing/queries";
import { createClient } from "@/lib/supabase/server";
import { InvoiceDetail } from "./invoice-detail";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let invoice;
  try {
    invoice = await getInvoice(id);
  } catch (e) {
    console.error("[InvoiceDetailPage] getInvoice failed:", e);
    notFound();
  }
  if (!invoice) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perms } = await supabase.rpc("current_user_permissions");
  const permissions: string[] = perms ?? [];

  return (
    <InvoiceDetail
      invoice={invoice}
      currentUserId={user?.id ?? ""}
      permissions={permissions}
    />
  );
}