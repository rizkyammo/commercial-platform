import { listProducts } from "@/features/master/products/queries";
import { ProductsClient } from "./products-client";
import { PageHeader } from "@/components/ui/page-header";

const PAGE_SIZE = 10;

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1));
  const q = params.q ?? "";
  const { data, count } = await listProducts({ q, page, pageSize: PAGE_SIZE });
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  return (
    <div>
      <PageHeader title="Products" description="Manage product master data." />
      <ProductsClient rows={data} total={count} page={page} totalPages={totalPages} q={q} />
    </div>
  );
}