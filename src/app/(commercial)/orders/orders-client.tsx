"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { getOrderDisplayStatus } from "@/features/orders/states";

type OrderRow = {
  id: string;
  order_number: string;
  po_number: string | null;
  po_date: string | null;
  status: string;
  business_model: string;
  currency: string;
  selling_value: number;
  margin: number;
  current_stage: string;
  amendment_count?: number;
  last_amendment_from_status?: string | null;
  customers?: { name: string } | null;
  sites?: { name: string } | null;
};

type Counters = { total: number; byStatus: Record<string, number> };

const TABS: { key: string; label: string; statusKey?: string }[] = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft", statusKey: "DRAFT" },
  { key: "SUBMITTED", label: "Submitted", statusKey: "SUBMITTED" },
  { key: "UNDER_REVIEW", label: "Review", statusKey: "UNDER_REVIEW" },
  { key: "RETURNED", label: "Returned", statusKey: "RETURNED" },
  { key: "APPROVED", label: "Approved", statusKey: "APPROVED" },
  { key: "CANCELLED", label: "Cancelled", statusKey: "CANCELLED" },
];

export function OrdersClient({
  rows,
  total,
  page,
  totalPages,
  q,
  status,
  customerId,
  counters,
  customers,
}: {
  rows: OrderRow[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
  status: string;
  customerId: string;
  counters: Counters;
  customers: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  function buildHref(p: number) {
    const sp = new URLSearchParams(search.toString());
    sp.set("page", String(p));
    return `${pathname}?${sp.toString()}`;
  }

  function selectTab(key: string) {
    const sp = new URLSearchParams(search.toString());
    if (key === "all") sp.delete("status");
    else sp.set("status", key);
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function submitSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sp = new URLSearchParams(search.toString());
    const nq = String(fd.get("q") ?? "");
    const nc = String(fd.get("customer") ?? "");
    if (nq) sp.set("q", nq);
    else sp.delete("q");
    if (nc) sp.set("customer", nc);
    else sp.delete("customer");
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  function resetFilters() {
    router.push(pathname);
  }

  function countForTab(key: string) {
    if (key === "all") return counters.total;
    return counters.byStatus[key] ?? 0;
  }

  const hasActiveFilter = Boolean(q || customerId || (status && status !== "all"));

  return (
    <div className="bg-white border border-[#E5E5EA] rounded-xl">
      <div className="p-4 border-b border-[#E5E5EA] flex flex-col gap-4">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => {
            const active = (status || "all") === t.key;
            return (
              <button
                key={t.key}
                onClick={() => selectTab(t.key)}
                className={`h-9 px-3 rounded-lg text-sm transition flex items-center gap-2 ${
                  active
                    ? "bg-[#EAF2FB] text-[#0A84FF] font-medium"
                    : "text-[#6E6E73] hover:bg-[#F2F2F4]"
                }`}
              >
                {t.label}
                <span
                  className={`text-xs px-1.5 rounded-full ${
                    active ? "bg-[#0A84FF]/15 text-[#0A84FF]" : "bg-[#F2F2F4]"
                  }`}
                >
                  {countForTab(t.key)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <form onSubmit={submitSearch} className="flex flex-1 gap-2 flex-wrap">
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search by order or PO number..."
              className="max-w-xs"
            />
            <Select
              name="customer"
              defaultValue={customerId}
              className="max-w-[220px]"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              Filter
            </Button>
            {hasActiveFilter && (
              <Button type="button" variant="ghost" onClick={resetFilters}>
                Reset
              </Button>
            )}
          </form>
          <Link href="/orders/new">
            <Button>+ New Order</Button>
          </Link>
        </div>
      </div>

      <Table>
        <THead>
          <TR>
            <TH>Order / PO</TH>
            <TH>Customer</TH>
            <TH>Site</TH>
            <TH>Business</TH>
            <TH>Value</TH>
            <TH>Margin</TH>
            <TH>Status</TH>
            <TH>Next</TH>
          </TR>
        </THead>
        <TBody>
          {rows.length === 0 && (
            <TR>
              <TD colSpan={8} className="text-center text-[#6E6E73] py-10">
                {hasActiveFilter
                  ? "Tidak ada order yang cocok dengan filter."
                  : "Belum ada order. Klik + New Order untuk membuat."}
              </TD>
            </TR>
          )}
          {rows.map((r) => {
            const marginPct =
              Number(r.selling_value) > 0
                ? (Number(r.margin) / Number(r.selling_value)) * 100
                : 0;

            const display = getOrderDisplayStatus({
              status: r.status,
              amendment_count: r.amendment_count,
              last_amendment_from_status: r.last_amendment_from_status,
            });

            return (
              <TR key={r.id}>
                <TD>
                  <Link
                    href={`/orders/${r.id}`}
                    className="font-medium hover:text-[#0A84FF]"
                  >
                    {r.order_number}
                  </Link>
                  <div className="text-xs text-[#8E8E93]">
                    {r.po_number ?? "No PO"}
                  </div>
                </TD>
                <TD className="text-[#6E6E73]">{r.customers?.name ?? "—"}</TD>
                <TD className="text-[#6E6E73]">{r.sites?.name ?? "—"}</TD>
                <TD>{r.business_model}</TD>
                <TD className="font-mono text-xs">
                  {r.currency} {Number(r.selling_value).toLocaleString("id-ID")}
                </TD>
                <TD>
                  <span className="text-sm">{marginPct.toFixed(1)}%</span>
                </TD>
                <TD>
                  <Badge tone={display.tone}>{display.label}</Badge>
                </TD>
                <TD>
                  <Link
                    href={`/orders/${r.id}`}
                    className="text-[#0A84FF] text-sm hover:underline"
                  >
                    Open →
                  </Link>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        total={total}
        pageSize={10}
        buildHref={buildHref}
      />
    </div>
  );
}