import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/page-header";

const cards = [
  { key: "customers", label: "Customers", href: "/master-data/customers", table: "customers" },
  { key: "sites", label: "Sites", href: "/master-data/sites", table: "sites" },
  { key: "products", label: "Products", href: "/master-data/products", table: "products" },
  { key: "vendors", label: "Vendors", href: "/master-data/vendors", table: "vendors" },
  { key: "transporters", label: "Transporters", href: "/master-data/transporters", table: "transporters" },
  { key: "contracts", label: "Contracts", href: "/master-data/contracts", table: "contracts" },
];

export default async function MasterDataOverview() {
  const supabase = await createClient();

  const counts = await Promise.all(
    cards.map(async (c) => {
      const { count } = await supabase
        .from(c.table)
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return { ...c, count: count ?? 0 };
    })
  );

  return (
    <div>
      <PageHeader
        title="Master Data"
        description="Manage core data used across the Commercial platform."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {counts.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className="bg-white dark:bg-[#1C1C1E] dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] dark:border-[#2C2C2E] rounded-xl p-5 hover:border-[#0A84FF] transition"
          >
            <div className="text-sm text-[#6E6E73] dark:text-[#8E8E93]">{c.label}</div>
            <div className="mt-2 text-2xl font-semibold">{c.count}</div>
            <div className="mt-1 text-xs text-[#8E8E93]">Active</div>
          </Link>
        ))}
      </div>
    </div>
  );
}