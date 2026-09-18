import { notFound } from "next/navigation";
import { getAuthorization, getAuthorizationScopes, getQuotaLinesByAuth } from "@/features/compliance/queries";
import { listProductsSimple } from "@/features/master/products/queries";
import { PageHeader } from "@/components/ui/page-header";
import { SkDetail } from "./sk-detail";

export default async function SkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sk = await getAuthorization(id);
  if (!sk) notFound();

  const [scopes, lines, products] = await Promise.all([
    getAuthorizationScopes(id),
    getQuotaLinesByAuth(id),
    listProductsSimple(),
  ]);

  return (
    <div>
      <PageHeader title={sk.sk_number} description={sk.issuing_authority} />
      <SkDetail sk={sk} lines={lines} products={products} />
    </div>
  );
}