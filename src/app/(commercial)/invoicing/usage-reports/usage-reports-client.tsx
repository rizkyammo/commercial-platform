"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { USAGE_REPORT_STATUSES } from "@/lib/constants/billing-models";

type Row = {
  id: string;
  report_number: string;
  project_code: string | null;
  report_type: string;
  period_start: string;
  period_end: string;
  period_type: string;
  status: string;
  total_qty: number;
  total_amount: number;
  total_transport: number;
  invoice_id: string | null;
  customers?: { id: string; code: string; name: string } | null;
  orders?: { id: string; order_number: string; business_model: string } | null;
};

const TABS = [
  { key: "all", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "SUBMITTED", label: "Submitted" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "INVOICED", label: "Invoiced" },
];

export function UsageReportsClient({
  rows,
  total,
  page,
  totalPages,
  q,
  status,
  reportType,
  projectCode,
  customerId,
  customers,
  pending,
  permissions,
}: {
  rows: Row[];
  total: number;
  page: number;
  totalPages: number;
  q: string;
  status: string;
  reportType: string;
  projectCode: string;
  customerId: string;
  customers: { id: string; code: string; name: string }[];
  pending: any[];
  permissions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const canCreate = permissions.includes("USAGE_REPORT_CREATE") ||
    permissions.includes("INVOICE_MANAGE") ||
    permissions.includes("ORDER_APPROVE");

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
    const nrt = String(fd.get("report_type") ?? "");
    const npc = String(fd.get("project_code") ?? "");
    if (nq) sp.set("q", nq); else sp.delete("q");
    if (nc) sp.set("customer", nc); else sp.delete("customer");
    if (nrt) sp.set("report_type", nrt); else sp.delete("report_type");
    if (npc) sp.set("project_code", npc); else sp.delete("project_code");
    sp.delete("page");
    router.push(`${pathname}?${sp.toString()}`);
  }

  const fmt = (n: number) =>
    `IDR ${Number(n).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6">
      {/* PENDING ALERT */}
      {pending.length > 0 && (
        <div className="bg-[#FF9500]/10 border border-[#FF9500]/30 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="font-medium text-[#A15C00]">
              {pending.length} usage report menunggu approval
            </span>
          </div>
          <button
            onClick={() => selectTab("SUBMITTED")}
            className="text-[#A15C00] text-sm font-medium hover:underline"
          >
            Lihat semua →
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {TABS.map((tab) => {
            const active = (status || "all") === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => selectTab(tab.key)}
                className={`h-9 px-3 rounded-lg text-sm whitespace-nowrap ${
                  active
                    ? "bg-[#EAF2FB] text-[#0A84FF] font-medium"
                    : "text-[#6E6E73] hover:bg-[#F2F2F4]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {canCreate && (
          <Link href="/invoicing/usage-reports/new">
            <Button variant="primary">+ New Usage Report</Button>
          </Link>
        )}
      </div>

      {/* FILTERS */}
      <form
        onSubmit={submitSearch}
        className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl p-4 flex gap-2 flex-wrap"
      >
        <Input
          name="q"
          defaultValue={q}
          placeholder="Cari report number..."
          className="max-w-xs"
        />
        <Input
          name="project_code"
          defaultValue={projectCode}
          placeholder="Project code"
          className="max-w-[140px]"
        />
        <Select
          name="report_type"
          defaultValue={reportType}
          className="max-w-[200px]"
        >
          <option value="">All Types</option>
          <option value="CONSIGNMENT_USAGE">Consignment Usage</option>
          <option value="BCM_VOLUME">BCM Volume</option>
        </Select>
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
      </form>

      {/* TABLE */}
      <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-xl">
        <Table>
          <THead>
            <TR>
              <TH>Report</TH>
              <TH>Customer / Project</TH>
              <TH>Type</TH>
              <TH>Period</TH>
              <TH className="text-right">Qty</TH>
              <TH className="text-right">Amount</TH>
              <TH>Status</TH>
              <TH>Invoice</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {rows.length === 0 ? (
              <TR>
                <TD
                  colSpan={9}
                  className="text-center text-[#6E6E73] py-10"
                >
                  Belum ada usage report.
                </TD>
              </TR>
            ) : (
              rows.map((r) => (
                <TR key={r.id}>
                  <TD>
                    <Link
                      href={`/invoicing/usage-reports/${r.id}`}
                      className="font-medium hover:text-[#0A84FF]"
                    >
                      {r.report_number}
                    </Link>
                    {r.project_code && (
                      <div className="text-xs text-[#8E8E93]">
                        {r.project_code}
                      </div>
                    )}
                  </TD>
                  <TD>
                    <div className="text-sm">
                      {r.customers?.name ?? "—"}
                    </div>
                    {r.orders && (
                      <Link
                        href={`/orders/${r.orders.id}`}
                        className="text-xs text-[#0A84FF] hover:underline"
                      >
                        {r.orders.order_number}
                      </Link>
                    )}
                  </TD>
                  <TD>
                    <Badge tone="grey">
                      {r.report_type === "BCM_VOLUME" ? "BCM" : "Consignment"}
                    </Badge>
                  </TD>
                  <TD className="text-xs">
                    <div>{r.period_start}</div>
                    <div className="text-[#8E8E93]">→ {r.period_end}</div>
                    <div className="text-[10px] text-[#8E8E93] uppercase mt-0.5">
                      {r.period_type}
                    </div>
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {Number(r.total_qty).toLocaleString("id-ID")}
                  </TD>
                  <TD className="text-right font-mono text-xs">
                    {fmt(Number(r.total_amount))}
                  </TD>
                  <TD>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </TD>
                  <TD>
                    {r.invoice_id ? (
                      <Link
                        href={`/invoicing/${r.invoice_id}`}
                        className="text-xs text-[#0A84FF] hover:underline"
                      >
                        View →
                      </Link>
                    ) : (
                      <span className="text-xs text-[#8E8E93]">—</span>
                    )}
                  </TD>
                  <TD className="text-right">
                    <Link
                      href={`/invoicing/usage-reports/${r.id}`}
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

function statusTone(
  s: string
): "green" | "blue" | "grey" | "red" | "orange" {
  if (s === "APPROVED" || s === "INVOICED") return "green";
  if (s === "SUBMITTED") return "blue";
  if (s === "REJECTED") return "red";
  if (s === "DRAFT") return "grey";
  return "orange";
}