"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";

type Row = {
  project_code: string;
  project_name: string | null;
  order_count: number;
  customer_count: number;
  material_revenue: number;
  service_revenue: number;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  total_margin_after_tax: number;
  first_order_at: string;
  last_order_at: string;
};

export function ProjectsClient({
  rows,
  total,
  page,
  totalPages,
  q,
}: {
  rows: Row[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const fmt = (n: number) =>
    `IDR ${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

  function buildHref(p: number) {
    const sp = new URLSearchParams(search.toString());
    sp.set("page", String(p));
    return `${pathname}?${sp.toString()}`;
  }

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams(search.toString());
    const nq = String(fd.get("q") ?? "");
    if (nq) sp.set("q", nq);
    else sp.delete("q");
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={submitSearch}
        className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-4 flex gap-2 flex-wrap"
      >
        <Input
          name="q"
          defaultValue={q}
          placeholder="Cari project code..."
          className="max-w-xs"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl">
        <Table>
          <THead>
            <TR>
              <TH>Project</TH>
              <TH className="text-right">Orders</TH>
              <TH className="text-right">Material Rev</TH>
              <TH className="text-right">Service Rev</TH>
              <TH className="text-right">Total Rev</TH>
              <TH className="text-right">Cost</TH>
              <TH className="text-right">Margin</TH>
              <TH className="text-right">Margin After Tax</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TR>
                <TD colSpan={9} className="text-center text-[#6E6E73] py-10">
                  Belum ada project.
                </TD>
              </TR>
            ) : (
              rows.map((r) => (
                <TR key={r.project_code}>
                  <TD>
                    <Link
                      href={`/projects/${encodeURIComponent(r.project_code)}`}
                      className="font-medium hover:text-[#0A84FF]"
                    >
                      {r.project_code}
                    </Link>
                    {r.project_name && (
                      <div className="text-xs text-[#8E8E93]">
                        {r.project_name}
                      </div>
                    )}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {r.order_count}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {fmt(Number(r.material_revenue))}
                  </TD>
                  <TD className="text-right font-mono text-xs text-[#34C759]">
                    {fmt(Number(r.service_revenue))}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {fmt(Number(r.total_revenue))}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {fmt(Number(r.total_cost))}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {fmt(Number(r.total_margin))}
                  </TD>
                  <TD className="text-right font-mono text-xs text-[#0A84FF]">
                    {fmt(Number(r.total_margin_after_tax))}
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/projects/${encodeURIComponent(r.project_code)}`}
                      className="text-[#0A84FF] text-sm hover:underline"
                    >
                      Open →
                    </Link>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          total={total}
          pageSize={20}
          buildHref={buildHref}
        />
      </div>
    </div>
  );
}